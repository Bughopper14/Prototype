# Technical guide

One Next.js application (App Router, TypeScript, React 19) on one MySQL database. The product flow is described in
[README.md](README.md); this file is for people changing the code.

## Stack

| Layer | Technology |
| --- | --- |
| Web + API | Next.js 15 (route handlers under `src/app/api`), Node runtime |
| UI | React 19, plain CSS (`login.css`, `portal.css`, CRM styles in `CrmStyles.tsx`), lucide icons, FontAwesome 6 for portal icons |
| Database | MySQL 8 through `mysql2` (no ORM), schema in `db/schema.sql` |
| Auth | Portal `users` table, Werkzeug-compatible password hashes, JWT cookie `los_session` + `session_logs` row |
| OCR | Python service (`services/ocr`): RapidOCR, PyMuPDF, Tesseract fallback, kept alive as a worker process |
| Storage | Local disk (`storage/`) or S3/MinIO |

## Setup

```bash
npm install
cp .env.example .env            # DB_*, JWT_SECRET (production), optional S3_*, PYTHON_PATH, COOKIE_SECURE
npm run db:setup                # creates the database, applies db/schema.sql + db/seed.sql, runs migrations
npm run user:create -- admin "<password>" "System Admin" --admin       # fresh database only
npm run dev                     # PORT env or 3000; every link is relative
```

OCR (optional): `python -m venv services/ocr/.venv`, then `services/ocr/.venv/Scripts/pip install -r services/ocr/requirements.txt`
(`.venv/bin/pip` on Linux/macOS). The API finds that virtual environment on its own; `PYTHON_PATH` overrides it.

Scripts: `npm run typecheck`, `npm run format` / `format:check`, `npm run build`, `npm run db:setup`, `npm run user:create`,
`npm run import:pre-analysis -- <folder> [--apply]`.

## Layout

```
src/
  app/                              routes (pages are thin: they compose components and read useCrm())
    login/  gallery/  user-management/
    crm-dashboard/                  layout.tsx = auth guard + CRM shell
      page.tsx, OverviewScreen.tsx  /crm-dashboard
      applications/                 list, new/, [id]/
      customers/  document-desk/  master-data/  notifications/  activity/
    documents/[...path]/            serves stored documents to signed-in users
    api/auth/*                      login, logout, change-password, heartbeat
    api/v1/[...path]/route.ts       single entry point of the REST API
  components/
    portal/                         PortalShell (navbar, menu, password dialog), LoginForm, UserManagement
    crm/
      CrmProvider.tsx               data every CRM page shares (applications, customers, notifications, toast)
      CrmShell.tsx, CrmStyles.tsx, CrmClientRoot.tsx
      common/                       small reusable pieces (SharedUi, PageHeading, AccessGate, ChangePasswordModal)
      application/                  ApplicationWorkspace and its sections (documents, editors, FAP modals, table)
      legal/  pre-analysis/  master-data/  ocr/  fap-preview/  activity/
      lazy.tsx                      code-split wrappers for heavy screens
  lib/
    shared/                         pure TypeScript used by browser and server (validation, deed workflow, catalogs)
    client/                            browser-side logic: api client, routes, formatters, OCR parsers, FAP templates
    server/
      db/pool.ts, query.ts          connection pool and one/many/exec/tx helpers
      db/repositories/              data access, one file per domain
      db/setup.ts                   migrations + master-data seeding (only run by scripts/db-setup.ts)
      auth/                         password hashing, sessions/JWT, route guard
      api/                          router, dispatch (auth, origin check, parsing), routes/ (controllers)
      domain/                       business rules (validation, installment, FAP diff)
      storage.ts  ocr/runner.ts     file storage; client of the Python OCR worker
db/                                 schema.sql (all DDL), seed.sql (reference data), reset-data.sql
scripts/                            db-setup, create-user, import-pre-analysis, dev/ (e2e, mint-session)
services/ocr/                       Python OCR service
```

Naming: React components and screens are `PascalCase.tsx`; everything else is `kebab-case.ts`. Pages stay thin; anything
reusable belongs in `components/`, anything about data belongs in `lib/`.

## Request flow

1. `middleware.ts` redirects page requests without a session cookie to `/login`.
2. `crm-dashboard/layout.tsx` (server) validates the session and passes the actor to `CrmClientRoot`.
3. The browser calls `/api/v1/...`; `dispatch.ts` checks the origin, parses JSON or multipart bodies, validates the
   session, binds the audit actor to the MySQL connection, then runs the matching controller from `api/routes/`.
4. Controllers call repositories; errors are mapped to RFC 7807 `application/problem+json`.

Roles come from `user_app_roles` (application 2 = CRM). `AccessGate` and the navigation hide pages the user has no
authority for; the API enforces roles independently.

## Database

`db/schema.sql` is the single source of truth for tables. `npm run db:setup` is idempotent: it creates the database, applies
the schema and `db/seed.sql`, then runs the migration and seeding helpers (including the audit triggers that fill
`created_by` / `updated_by`). The running app never creates tables.

`db/reset-data.sql` empties every table and keeps the structure (read its header first; back up before running it).

Pre-Analysis form data is one JSON document per application in `application_pre_analysis.form_data`.

## Sessions

`authenticate()` verifies the JWT, the `users` row (active, not force-logged-out) and the `session_logs` row (not ended,
inside the lifetime and inactivity limits; unlimited for admins). A successful check is cached for 15 seconds per
session; every User Management write clears the cache, so force-logout and role changes apply on the next request.

The cookie is `HttpOnly; SameSite=Lax`. `Secure` is added only for HTTPS requests (or `COOKIE_SECURE=true`), otherwise
browsers drop the cookie on plain-HTTP office addresses.

## OCR

`ocr_worker.py` keeps the models loaded and answers one JSON line per request; `src/lib/server/ocr/runner.ts` starts it on
demand (and `POST /api/v1/ocr/warmup` loads it in the background when the CRM opens), queues requests, and restarts it
after a crash or timeout. A warm scan takes 0.2–3 s; the first one after a restart waits for the model load.

```
services/ocr/
  ocr_service.py        process_document(): PDF/image reading, fallbacks, document type detection
  ocr_worker.py         long-lived process used by the API
  ocr_cli.py            one-shot: python ocr_cli.py <file> [type]
  form_extractors.py    FAP / KTP / NIB specific extraction
  app/                  schemas, config, ocr_engine, preprocessor, extractor
  tessdata/             Tesseract language data (git-ignored, exported as TESSDATA_PREFIX)
```

OCR output is a suggestion: names and dates need to be checked by a person.

## Performance notes

- Every CRM page is its own route chunk; heavy screens (Pre-Analysis, OCR modal, FAP preview, activity) are loaded on demand,
  and tesseract.js only loads when a scan runs.
- `/api/v1/master-data` (about 15 MB of JSON, 3 MB gzip) is revalidated with an ETag, so repeat visits cost a 304.
- Identical GET requests made within 1.5 s share one network call (`lib/client/api.ts`).
- Static documents are only served to signed-in users and cached privately.

## Testing

`scripts/dev/e2e-write-flow.ts` drives the real HTTP API end to end (login, customer, application, saves, legal,
upload/verify, FAP approval and OCR comparison, workflow, user management, logout). It writes data, so use a throw-away database:

```bash
DB_NAME=crm_test npm run db:setup
DB_NAME=crm_test npm run user:create -- e2e-admin "E2e-Pass-123" "E2E Admin" --admin
DB_NAME=crm_test npx next start -p 3100          # after npm run build
npx tsx --env-file=.env scripts/dev/e2e-write-flow.ts
```

## Known gaps

- Web-push notifications of the old portal are not ported.
- Repositories still contain legacy `CREATE TABLE` / `ALTER` migration code next to `db/schema.sql`; they are only executed by
  `db:setup` and can be removed once all environments are on the current schema.
- `PreAnalysisForm`, `ApplicationWorkspace` and `Documents` are large components that should be split by tab.
