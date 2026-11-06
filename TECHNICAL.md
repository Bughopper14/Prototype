# Technical guide

A pnpm + Turborepo monorepo: a Vite React frontend, a NestJS backend, a Python OCR service and one shared TypeScript
package, on one MySQL database. The product flow is described in [README.md](README.md); this file is for people
changing the code.

## Stack

| Part | Technology |
| --- | --- |
| `apps/frontend` | Vite 6, React 19, React Router 7, plain CSS (`login.css`, `portal.css`, CRM styles in `features/crm/styles/*.css`, injected by `CrmStyles.tsx` only inside the CRM), lucide icons, FontAwesome 6 for portal icons, TinyMCE, tesseract.js |
| `apps/backend` | NestJS 11 on Express, `mysql2` (no ORM), JWT session cookie, helmet, compression, S3/MinIO or local disk storage |
| `apps/ocr` | Python 3.12: RapidOCR, PyMuPDF, Tesseract fallback, kept alive as a worker process started by the backend |
| `packages/shared` | Framework-free TypeScript used by both sides (field definitions, input validation, master catalog, deed workflow), built to ESM + CJS with tsup |
| Tooling | pnpm workspaces, Turborepo (build order + cache), TypeScript 5, Prettier |

## Setup

```bash
pnpm install
cp apps/backend/.env.example apps/backend/.env   # DB_*, JWT_SECRET (production), optional S3_*, CORS_ORIGINS
pnpm db:setup                                    # creates the database, applies db/schema.sql + db/seed.sql, runs migrations
pnpm user:create admin "<password>" "System Admin" --admin       # fresh database only
pnpm dev                                         # frontend http://localhost:3000, API http://localhost:3001
```

OCR: `python -m venv apps/ocr/.venv`, then `apps/ocr/.venv/Scripts/pip install -r apps/ocr/requirements.txt`
(`.venv/bin/pip` on Linux/macOS). The backend finds that virtual environment on its own; `PYTHON_PATH` overrides it.

Root scripts (run through Turborepo, `packages/shared` is always built first):

| Command | What it does |
| --- | --- |
| `pnpm dev` | shared in watch mode, NestJS in watch mode, Vite dev server |
| `pnpm build` | shared → `dist/`, backend → `apps/backend/dist/`, frontend → `apps/frontend/dist/` |
| `pnpm typecheck` | `tsc --noEmit` in every package |
| `pnpm format` / `format:check` | Prettier for the whole repo |
| `pnpm db:setup`, `pnpm user:create`, `pnpm import:pre-analysis <folder> [--apply]` | backend scripts |

Run one package only with `pnpm --filter @liugong/backend <script>` (or `@liugong/frontend`, `@liugong/shared`).

## Layout

```
apps/
  frontend/
    index.html, vite.config.ts      dev proxy: /api and /documents → backend (API_URL, default :3001)
    public/                         img/, tinymce/, pre_analysis/ (served as-is)
    src/
      main.tsx, App.tsx             router (every page is its own lazy chunk)
      features/<domain>/            one folder per domain, same layout everywhere:
                                      *Page.tsx      route entry (only these sit at the feature root)
                                      components/    .tsx only; subfolders per tab / section when a screen is big
                                      hooks/         React state + handlers (use*.ts)
                                      lib/           pure logic and types (.ts), no React
                                      styles/        .css files (CRM only)
        auth/                       LoginPage; components/LoginForm
        portal/                     GalleryPage; components/PortalShell (navbar, menu, password dialog)
        user-management/            UserManagementPage; components/ (screen, ui/, forms/), lib/ (types, um-api)
        crm/                        CrmLayout; components/ (CrmProvider, CrmShell, CrmStyles, AccessGate, PageHeading,
                                    ChangePasswordModal, lazy = code-split heavy screens); styles/01-…11-*.css
        overview/                   dashboard
        applications/               list, new and detail pages; components/ApplicationWorkspace (layout only) +
                                    workspace/ (header/, tabs/, customer/ sections, dialogs/, action bars);
                                    hooks/ (useApplicationWorkspace + save, activity, live FAP data, preview sync, deed review)
        pre-analysis/               components/PreAnalysisForm (layout only) + form/ (7 sections, group-structure/,
                                    expert-judgement/, dealer-cross-check/) + preview/ (7 sections, toolbar, diagram);
                                    hooks/ (usePreAnalysisState, useGroupStructure, usePreAnalysisPrint);
                                    PreAnalysisContext shares the state with the sections; lib/ (types, defaults, diff…)
        legal/                      components/ LegalEditor + legal-editor/ (deed headings, menu, modals),
                                    StakeholderModalDialog + stakeholder-modal/ (form, doc tabs, viewer, OCR results);
                                    hooks/ (useLegalEditor, useStakeholderModal), lib/
        documents/                  components/Documents + studio/ (fap/ compare view, evidence/ viewer); hooks/ (studio
                                    state, file actions, FAP sheet data, OCR polling, section nav); DocumentDesk
        customers/                  customer directory
        fap/                        components/ (FapSheetPreview, comparison + archive modals), lib/ (cell maps, template)
        master-data/                components/ catalog/ (menu drawer, group table), mandatory/ (toolbar, summary,
                                    table, badges, edit dialog), location/ (columns, country picker); hooks/, lib/
        activity/  ocr/             components/ + lib/ (activity store, diff); ocr/lib/id-documents (KTP, passport,
                                    NPWP, KITAS parsers), ocr/lib/nib, ocr/components/nib-modal + hooks/useNibOcrModal
      shared/                       used by many features; never imports from features/
        lib/                        api client, session guard, routes, formatters, dates, auth helpers
        ui/                         Badge, IconBox, Fields, Repeater, Modal
        master-data/                catalog store, mandatory rules, wilayah matching, MasterSelect, MasterItemDialog
  backend/
    src/
      main.ts                       bootstrap: helmet, compression, CORS allowlist, trust proxy, body parsers
      app.module.ts                 imports every domain module; registers the global guards/interceptor/filter
      config/load-env.ts            loads apps/backend/.env
      core/                         shared by every module
        http/                       guards (origin, session, write validation), result interceptor, problem filter,
                                    body parsers, @ApiReq() / @Public() decorators
        db/                         connection pool, one/many/exec/tx helpers, audit context, setup (migrations)
        domain/                     Problem/ensure + business rules (stakeholders, financials, installment)
        storage.ts, ready.ts        file storage (disk or S3); database readiness check
      modules/                      one folder per domain: <name>.module.ts, <name>.controller.ts, *.repository.ts
        auth/                       /api/auth/* (login, logout, password, heartbeat), /auth/me, sessions/JWT
        portal/                     Apps Hub gallery, page access
        users/                      /um/* user management (ManageSystemGuard)
        customers/  applications/   customer directory; application intake, page saves, workflow, checklist
        pre-analysis/  legal/       Pre-Analysis form; legal draft and deed review
        documents/                  uploads, signed file links, document desk, /documents/* files
        identity-documents/         KTP / NPWP / passport / KITAS scan and storage
        ocr/                        Python OCR worker client, warm-up
        fap/                        FAP OCR comparison, approval, immutable submission archive
        master-data/                master catalog, mandatory rules, wilayah lookup
        activity/                   activity feed, notifications, workspace menus
        system/                     health checks
    db/                             schema.sql (all DDL), seed.sql (reference data), reset-data.sql
    scripts/                        db-setup, create-user, import-pre-analysis, dev/ (e2e, mint-session, check-password)
  ocr/                              Python OCR service (see OCR below)
packages/
  shared/src/                       age, deed-workflow, experience, fields, input-validation, master-catalog
```

Rules:

- The frontend talks only to the backend (`/api`, `/documents`). It never knows the OCR service or the database.
- `packages/shared` has no React, NestJS or Node APIs. If both sides need a type, a rule or a constant, it goes there,
  then `pnpm build` catches every place that no longer matches.
- Naming: React components are `PascalCase.tsx` (pages end in `Page.tsx`); everything else is `kebab-case.ts`.
- One domain = one folder on both sides (`apps/backend/src/modules/<domain>`, `apps/frontend/src/features/<domain>`). Code
  used by several features goes to `shared/` (frontend) or `core/` (backend), never the other way round.

## Request flow

1. The browser loads the Vite app. `RequireSession` (`lib/session.tsx`) calls `GET /api/v1/auth/me` and sends signed-out
   users to `/login?next=…`.
2. The browser calls `/api/v1/...` on its own origin; Vite (dev) or the reverse proxy (production) forwards it to NestJS.
3. Express middleware parses JSON, form posts and multipart uploads (max 20 MB; malformed JSON → 400).
4. Global guards run in order: `OriginGuard` (writes from another origin → 403), `SessionGuard` (valid session unless the
   route is `@Public()`), `WriteValidationGuard` (shared input rules from `@liugong/shared` → 422). Module guards follow,
   e.g. `ManageSystemGuard` on `/um/*`.
5. The domain controller runs. `ApiResultInterceptor` binds the audit actor to the MySQL connection (triggers fill
   `created_by` / `updated_by`), sets `Cache-Control: no-store` and sends the returned value as JSON (status 200 unless the
   handler sets another one).
6. Errors are mapped by `ProblemFilter` to RFC 7807 `application/problem+json` without stack traces; an expired session
   answers 401 `SESSION_TIMEOUT` and clears the cookie.

Adding an endpoint: put a method on the domain's controller (`@Get('applications/:id/x')`, parameters
`@ApiReq() req, @Res() res`), return the result, and keep data access in that module's `*.repository.ts`. A new domain
gets its own folder with `<name>.module.ts` and is added to `AppModule.imports`. Two developers working on different
domains therefore touch different folders.

Roles come from `user_app_roles` (application 2 = CRM). `AccessGate` and the navigation hide pages the user has no
authority for; the API enforces roles independently (for example every `/um/*` route needs `manage_system`).

## Security

| Concern | How it is handled |
| --- | --- |
| Secrets | Only in `apps/backend/.env` (git-ignored). The frontend has no secrets; `apps/frontend/.env` is read by `vite.config.ts` only. |
| Sessions | JWT in cookie `los_session` (`HttpOnly; SameSite=Lax`, `Secure` on HTTPS) plus a `session_logs` row; the token is never in a response body. |
| CSRF | Writes with a foreign `Origin` are rejected (403). |
| CORS | Off by default (same origin through the proxy). Extra origins go in `CORS_ORIGINS`. |
| Brute force | 10 failed logins per IP lock login for 15 minutes. |
| Headers | helmet (HSTS, nosniff, frame options, referrer policy), no `X-Powered-By`, API responses `Cache-Control: no-store`. |
| Files | `/documents/*` needs a session and is confined to the storage folder (path traversal returns 404). |
| Proxy | `TRUST_PROXY` (default `loopback`) decides which `X-Forwarded-*` headers are trusted. |

## Database

`apps/backend/db/schema.sql` is the single source of truth for tables. `pnpm db:setup` is idempotent: it creates the
database, applies the schema and `db/seed.sql`, then runs the migration and seeding helpers (including the audit triggers
that fill `created_by` / `updated_by`). The running app never creates tables.

`db/reset-data.sql` empties every table and keeps the structure (read its header first; back up before running it).

Pre-Analysis form data is one JSON document per application in `application_pre_analysis.form_data`.

## Sessions

`authenticate()` verifies the JWT, the `users` row (active, not force-logged-out) and the `session_logs` row (not ended,
inside the lifetime and inactivity limits; unlimited for admins). A successful check is cached for 15 seconds per
session; every User Management write clears the cache, so force-logout and role changes apply on the next request.

`Secure` is added only for HTTPS requests (or `COOKIE_SECURE=true`); otherwise browsers drop the cookie on plain-HTTP
office addresses.

## OCR

`ocr_worker.py` keeps the models loaded and answers one JSON line per request. `apps/backend/src/modules/ocr/ocr-runner.ts` starts it
on demand (and `POST /api/v1/ocr/warmup` loads it in the background when the CRM opens), queues requests, and restarts it
after a crash or timeout. A warm scan takes 0.2–3 s; the first one after a restart waits for the model load.

```
apps/ocr/
  ocr_service.py        process_document(): PDF/image reading, fallbacks, document type detection
  ocr_worker.py         long-lived process used by the backend
  ocr_cli.py            one-shot: python ocr_cli.py <file> [type]
  form_extractors.py    FAP / KTP / NIB specific extraction
  app/                  schemas, config, ocr_engine, preprocessor, extractor
  tessdata/             Tesseract language data (git-ignored, exported as TESSDATA_PREFIX)
```

The backend looks for the service in `../ocr` relative to `apps/backend` (`OCR_DIR` overrides it). OCR output is a
suggestion: names and dates need to be checked by a person.

## Deployment

- Frontend: `pnpm build`, then serve `apps/frontend/dist/` as static files. Send every unknown path to `index.html`
  (client-side routing) and proxy `/api` and `/documents` to the backend. Files under `assets/` have content hashes and
  can be cached for a year.
- Backend: `pnpm build`, then `node apps/backend/dist/main.js` from `apps/backend` with its `.env`. Set `JWT_SECRET`
  (required in production) and `TRUST_PROXY` for the reverse proxy.
- OCR: the Python virtual environment must exist next to the backend (`apps/ocr/.venv`) or `PYTHON_PATH` must point to one.

## Performance notes

- Every page is its own chunk; heavy screens (Pre-Analysis, OCR modal, FAP preview, activity) load on demand, and
  tesseract.js only loads when a scan runs. React and TinyMCE are separate vendor chunks.
- `/api/v1/master-data` (about 15 MB of JSON, 3 MB gzip) is revalidated with an ETag, so repeat visits cost a 304.
- Identical GET requests made within 1.5 s share one network call (`apps/frontend/src/shared/lib/api.ts`).
- Stored documents are only served to signed-in users and cached privately for 5 minutes.

## Testing

`apps/backend/scripts/dev/e2e-write-flow.ts` drives the real HTTP API end to end (login, customer, application, saves,
legal, upload/verify, FAP approval and OCR comparison, workflow, user management, logout). It writes data, so use a
throw-away database (from `apps/backend`):

```bash
DB_NAME=crm_test pnpm db:setup
DB_NAME=crm_test pnpm user:create e2e-admin "E2e-Pass-123" "E2E Admin" --admin
pnpm build && DB_NAME=crm_test API_PORT=3100 node dist/main.js     # in another terminal
npx tsx scripts/dev/e2e-write-flow.ts
```

The FAP OCR step also needs `apps/ocr/.venv` and `scripts/dev/fixtures/test_doc_fap_stage.pdf` (git-ignored).
`scripts/dev/mint-session.ts <username>` prints a session cookie for manual API checks with curl.

## Known gaps

- Big screens keep their state in one hook per screen (`use*` in `hooks/`, 300–900 lines) shared with their sections
  through a React context; parts of those hooks call each other before declaration and can only be split further by hand.
- `GET /api/v1/master-data` sends about 15 MB per first load; it should be split or loaded lazily.
- OCR with `doc_type=auto` misdetects KTP/NPWP and fails on the NIB PDF; the UI always sends an explicit type.
- Web-push notifications of the old portal are not ported.
- Repositories still contain legacy `CREATE TABLE` / `ALTER` migration code next to `db/schema.sql`; they are only executed by
  `db:setup` and can be removed once all environments are on the current schema.
