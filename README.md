# LiuGong Finance · Portal & CRM (LOS)

One Next.js (App Router, TypeScript) application with a MySQL database:

| URL | What |
| --- | --- |
| `/login` | Portal login (portal `users` table, Werkzeug-compatible hashes) |
| `/gallery` | Apps hub: the applications each user has a role for |
| `/user-management` | Users, roles, authorities, applications, audit log, sessions (needs `manage_system`) |
| `/crm-dashboard` | CRM / Loan Origination workspace (FAP, Pre-Analysis, legal, documents) |
| `/api/auth/*` | login, logout, change-password, heartbeat |
| `/api/v1/*` | CRM + user-management REST API |

One login, one session cookie (`los_session`, JWT + `session_logs` row for inactivity / force-logout), one database.
The port is not fixed: `next dev` / `next start` use `PORT` (default 3000), and every link is relative.

## Setup

```bash
npm install
cp .env.example .env        # fill in DB_* and (production) JWT_SECRET
npm run db:setup            # creates the DB, applies db/schema.sql + db/seed.sql, runs migrations & master-data seeding
npm run user:create -- admin "<password>" "System Admin" --admin   # only for a fresh database
npm run dev
```

`db:setup` is idempotent and safe to re-run on an existing database. The app itself never creates tables at request time.

## Layout

```
src/
  app/                       Next.js routes (pages + route handlers)
    login/ gallery/ user-management/ crm-dashboard/ documents/
    api/auth/*               auth endpoints
    api/v1/[...path]/        single entry point for the REST API → lib/server/api
  components/
    portal/                  login, gallery, user management UI (.tsx only)
    crm/                     CRM workspace, one folder per feature (.tsx only)
      App.tsx                shell: navigation, session, page switching
      common/                shared UI (Badge, Modal, Fields, ...) and the change-password dialog
      overview/              Overview, Customer directory, Document desk
      application/           application detail, documents, editors, FAP comparison & archive
      legal/                 deeds, stakeholders, legal editor, deed review
      pre-analysis/          Pre-Analysis form
      master-data/           master-data screens + hooks
      ocr/                   NIB OCR modal
      fap-preview/           FAP sheet previews
      activity/              activity & notifications screens
      lazy.tsx               code-split wrappers (Pre-Analysis, OCR, FAP preview, Activity)
  lib/
    shared/                  pure TypeScript used by both browser and server (validation, deed workflow, catalogs)
    crm/                     browser-side logic for the CRM (.ts only): api client, auth helpers, formatters,
                             OCR parsers, FAP templates, activity store
    server/
      db/
        pool.ts              mysql2 pool (DB_* env), audit-actor binding
        query.ts             reusable helpers: one / many / exec / tx
        repositories/        data access per domain (intake, legal, documents, masters, users, ...)
        setup.ts             migrations + master-data seeding (used by scripts/db-setup.ts only)
      auth/                  password hashing, JWT/session, route guard
      api/
        router.ts            tiny route registry + problem+json errors
        dispatch.ts          auth, origin check, body parsing, audit actor
        context.ts           shared helpers: file storage, OCR runner, master-data cache, activity log
        routes/              controllers: system, master, applications, deeds, documents, fap, user-management
      domain/                business rules (validation, installment, FAP diff)
db/
  schema.sql                 all DDL, single source of truth
  seed.sql                   reference data only (portal apps, roles, authorities, mandatory rules; no users)
  reset-data.sql             empties every table, keeps the structure (read its header first)
scripts/
  db-setup.ts  create-user.ts  import-pre-analysis.ts   (legacy <app-id>.json → MySQL, with backups)
  dev/                       test/dev helpers (e2e-write-flow, mint-session, check-password, fixtures)
services/ocr/                Python OCR service called by the API (ocr_cli.py)
```

## Testing the write path

`scripts/dev/e2e-write-flow.ts` drives the real HTTP API (login → customer → application → page saves → legal → upload/verify →
FAP approval → pre-analysis → workflow → user management → logout). It writes data, so use a throw-away database:

```bash
DB_NAME=crm_test npm run db:setup
DB_NAME=crm_test npm run user:create -- e2e-admin "E2e-Pass-123" "E2E Admin" --admin
DB_NAME=crm_test npx next start -p 3100        # in another terminal (after npm run build)
npx tsx --env-file=.env scripts/dev/e2e-write-flow.ts
```

## Performance notes

- Heavy screens are code-split (`components/crm/lazy.tsx`); tesseract.js loads only when an OCR scan runs.
- `/api/v1/master-data` (~15 MB JSON, 3 MB gzip) is revalidated with an ETag, so repeat visits cost a 304.
- Session validation (several queries) is cached for 15 s per session; force-logout clears the cache.

## Storage

Uploads go to `storage/documents` and `storage/files` (override with `STORAGE_DIR`), or to S3/MinIO when the `S3_*` variables are set.
Documents are only served to signed-in users.

## OCR

`services/ocr` is a self-contained Python service that the API calls as `python services/ocr/ocr_cli.py <file> <type>`
(`PYTHON_PATH` selects the interpreter).

```
services/ocr/
  ocr_cli.py            entry point used by the API (prints JSON)
  ocr_handler.py        FAP / KTP form-specific extraction
  app/config.py         confidence thresholds
  app/schemas.py        result models (KTP, NPWP, passport, KITAS, ...)
  app/services/         ocr_engine (RapidOCR), preprocessor (PDF/image, orientation, deskew), extractor
  tessdata/             Tesseract language data (git-ignored, exported as TESSDATA_PREFIX)
```

Setup (Python 3.10+): `python -m venv services/ocr/.venv`, then `services/ocr/.venv/Scripts/pip install -r services/ocr/requirements.txt` (Linux/macOS: `.venv/bin/pip`). The API picks up that virtual environment automatically; `PYTHON_PATH` overrides it. The first request after a restart is slower while the models load. Sample documents for manual tests are in `scripts/dev/fixtures`.

## Not ported yet

- Web-push notifications and the service worker of the old portal.
- The PostgreSQL/PGlite demo seeds and the old Node test-suite (dropped; see git history of branch axel).
