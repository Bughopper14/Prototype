# QA Execution Plan: LiuGong Finance LOS/CRM

Assessment-only. No application code, config, schema or data is changed. All outputs live in `UAT/`.
Created 2026-11-10. Companion files: `qa-progress.md`, `session-handoff.md`, `application-inventory.md`.

## 1. Objectives and scope
Independent QA of the whole monorepo: frontend, backend API, MySQL database, OCR service, integrations, security, performance and code quality. Output is a prioritized findings list plus `uat-report.md`. Fixes need explicit approval afterwards.

## 2. Architecture (verified from source)
| Layer | Technology | Where |
|---|---|---|
| Monorepo | pnpm workspaces + turbo, Node >= 22 | `package.json`, `pnpm-workspace.yaml` |
| Frontend | React + Vite + react-router (lazy routes), port 3100, proxies `/api` and `/documents` | `apps/frontend` |
| Backend | NestJS 11 on Express 5, helmet, compression, zod, JWT cookie sessions, port `API_PORT` (3001 in .env) | `apps/backend` |
| Database | MySQL (mysql2), DB `crm-liugong` (live dev data); `crm_test` also exists on the same server | `apps/backend/db/*.sql`, runtime DDL in `*/initialize.ts` |
| OCR | Python service/CLI invoked by backend (`ocr-runner.ts`) for NIB, KTP, KITAS, passport | `apps/ocr` |
| Storage | local `apps/backend/storage` plus optional S3 (aws-sdk) | documents module |
| Shared | `packages/shared` | |
| Existing tests | None found (no vitest/jest/playwright in package.json). Only `scripts/dev/e2e-write-flow.ts` and prior `uat-result.md`. | |
| Background jobs | No cron/scheduler found. Only timers inside request handling (OCR timeouts, 6 s FAP processing timeout). Web-push (vapid_keys, web_push_subscriptions) tables exist. | |

Frontend currently answers on :3100 and `/api/v1/health` returns `{"status":"ok"}` through the proxy, so the backend is up.

## 3. Phases, tasks and IDs
| Phase | Task IDs | Description | Effort |
|---|---|---|---|
| 1 Discovery | DISC-001..006 | repo structure, startup, env/config (secrets redacted), endpoint + route + table inventory, auth model, prior-run review | S |
| 2 Environment | ENV-001..005 | confirm what is running, DB reachable read-only, browser tooling, OCR availability, **agree test environment/accounts** | S |
| 3a Frontend | FE-001..014 | one task per route/module (login, gallery, user-management, overview, applications list/new/detail with 6 tabs, document desk, customers, master data, notifications, activity), plus responsive and console/network pass | L |
| 3b Backend/API | BE-001..016 | one task per controller group (auth, um, applications, customers, documents/files, fap, identity-docs/OCR, legal, master-data, pre-analysis, activity, portal, system), auth matrix per authority, negative tests | L |
| 4 Database | DB-001..008 | schema, FKs/indexes/checks/triggers, integrity queries (read-only), migrations/seed vs live, runtime DDL, query patterns/EXPLAIN, privileges, static-vs-DB data | M |
| 5 Code review | CR-001..008 | auth/session, SQL construction, validation, duplication, hardcoded data, dead code, large files, error handling | M |
| 6 Integration/System/UAT | INT-001..006, SYS-001..008, UAT-001..012 | end-to-end application lifecycle (draft, FAP, legal/deed, review, pre-analysis, approval), role switching, session expiry, persistence | L |
| 7 Security/Performance | SEC-001..012, PERF-001..006 | OWASP-style checks, IDOR, authz per authority, XSS, upload handling, headers, cookies; timing and bundle size | M |
| 8 Documentation | DOC-001..006 | test-case files, findings files, uat-report, coverage audit | M |

Execution order: DISC, ENV, DB read-only audit and CR (no environment needed), then FE/BE/INT/SYS/UAT/SEC/PERF once the test environment is agreed, then DOC.

## 4. Test strategy per area
- **Frontend**: drive the real UI with headless Chrome over the DevTools protocol (Chrome 157 installed; no Playwright in repo and installing is not allowed). Screenshots at 1440, 820 and 390 px widths. Capture console errors and failed requests.
- **Backend**: direct HTTP via Node `fetch` scripts kept in `UAT/tools/`. For each endpoint: happy path, missing/invalid payload, wrong type, oversized, unauthenticated, wrong-authority, nonexistent id. Verify DB state afterwards with read-only SELECTs.
- **Database**: read-only `information_schema`, `SHOW`, `SELECT`, `EXPLAIN` only. Integrity queries for orphans, duplicates, NULL anomalies, date shifts.
- **Security**: authority matrix across all roles, IDOR on `:id` routes, cookie flags, CORS, error leakage, XSS in free-text fields, upload type/size, path traversal on `/documents/*path` and `files/:id/content`.
- **Performance**: record endpoint latency (n runs, median/p95), bundle sizes from `dist`, query plans. Only measured numbers are reported.
- **Screenshots**: `UAT/screenshots/<SectionID>-<module>/<SectionID>-<feature>-<scenario>.png`, real browser captures only, no credentials visible.

## 5. Dependencies, prerequisites, blockers
1. **Test environment (decision needed).** The only configured database is the live dev DB `crm-liugong` (47 users, 28 applications, 2309 audit rows). Logging in already writes `session_logs`/`audit_logs`, and every workflow test writes data. Read-only work is unaffected. See open question Q1 in the handoff.
2. Credentials: none are provided for this session. An earlier tool in `UAT/tools/probe.mjs` contains a test login (`e2e-admin`); I will not use it or any account without your OK.
3. OCR needs Python and its dependencies; availability unverified.
4. S3 integration cannot be tested without credentials (document as NOT TESTED if absent).
5. Working tree has many uncommitted changes (about 60 modified files), so results describe the code as it is on disk now.
6. A prior run (`uat-result.md`, 9 Nov, 228 checks, 73 failed) exists. It is used as a lead list and will be re-verified, not trusted.

## 6. Deliverables
`qa-execution-plan.md`, `qa-progress.md`, `session-handoff.md`, `application-inventory.md`, `uat-report.md`, `test-cases/*.md` (frontend, backend, database, integration, system, security, uat-scenarios), `code-review/*.md` (code-review-findings, database-findings, recommendations), `screenshots/`, `evidence/`, `tools/`.

## 7. Estimated effort
Discovery/inventory/plan: done this session. DB + code review: 1 session each. FE + BE + integration/system/UAT: 3 to 4 sessions once environment is agreed. Docs and final audit: 1 session.
