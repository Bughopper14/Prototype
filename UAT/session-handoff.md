# Session Handoff

Updated: 2026-11-10, end of session 1.

## State
- Last completed phase: PHASE 1 (discovery and planning).
- Last completed task: ENV-001. Current task: none in progress.
- Stopping point: QA environment is up (ENV-003 done). Next is DB audit (read-only) and then BE auth matrix.
- Files created: `qa-execution-plan.md`, `qa-progress.md`, `application-inventory.md`, this file. Pre-existing in UAT/: `evidence/db-schema-dump.json`, `tools/{analyze-schema,db-audit,probe}.mjs` (from an earlier run; `UAT/` is untracked in git).
- Screenshots captured: 0. Test cases executed: 0. Confirmed findings: 0 (only pre-test observations in the inventory).
- No application code, config, DB schema or data has been modified. The only database contact this session was none (schema info came from the existing dump). Only `GET /api/v1/health` and `GET /` on :3100 were hit.

## QA environment (set up 2026-11-10 after user chose option (a): separate database `crm_qa`)
- Database `crm_qa` created via `DB_NAME=crm_qa pnpm db:setup` (schema.sql + seed.sql + runSetup). 67 tables, 4 roles, 40 authorities, 203 mandatory rules, 0 location master rows. `crm-liugong` was not touched.
- QA backend: `node apps/backend/dist-qa/main.js` with env `DB_NAME=crm_qa API_PORT=3201 STORAGE_DIR=../../UAT/qa-storage` (log: `UAT/evidence/qa-backend.log`). `dist-qa/` was built with `tsc -p tsconfig.build.json --outDir dist-qa` from the working tree. It is NOT gitignored: delete it at the end, or ask before adding to .gitignore.
- QA frontend: `API_URL=http://localhost:3201 PORT=3200 npx vite` in `apps/frontend` (log: `UAT/evidence/qa-frontend.log`). Test via http://localhost:3200. The original dev stack (3100/3001, live DB) must not be used for tests.
- QA account: `qa-admin` (Super Admin), created in crm_qa only. Password is in the shell history of this session only; recreate other role users via `DB_NAME=crm_qa pnpm user:create`. When sending passwords in curl, use `--data @file` (bash `!` expansion broke an inline attempt).
- Processes must be restarted in a new session (they were started with nohup in this session).
- Limitations (resolved by Q4): no wilayah (province/city/district/village) master data in crm_qa. Address-cascade tests need it loaded or copied read-only from crm-liugong into crm_qa (decision pending, Q4).

## Open questions for the user
- ~~Q1~~ ANSWERED: separate DB `crm_qa`. Q2 (accounts): I create QA users in crm_qa. Q3: assumed OK (started Chrome-free so far; only a second backend and Vite). Original text of Q1 follows.
- ~~Q4~~ ANSWERED yes ("okei"); done 2026-11-10: copied provinsi 39, kabupaten_kota 516, kecamatan 7287, kelurahan_desa 83763, kode_pos 10759 into crm_qa via cross-database INSERT..SELECT (read-only on crm-liugong). Note counts differ from the older dump (kecamatan 7196, kelurahan 83082), so that dump is stale. Original: may I copy the wilayah master tables (about 100k rows) from `crm-liugong` into `crm_qa` (read from live, write only to crm_qa)?
- **Q1: test environment.** Only `crm-liugong` (live dev data) is configured. Options: (a) I create a separate empty database (e.g. `crm_qa`) on the same MySQL server from `schema.sql` + seed and run a second backend instance on another port pointed at it. This is a new DB, nothing existing changes. Recommended. (b) Run against `crm-liugong` and only create/clean `UAT-` prefixed records (the earlier run did this). (c) Read-only only: static, DB and code review, no login or workflow testing.
- **Q2: accounts.** Which login may I use? With option (a) I would create QA users in the new DB myself.
- **Q3:** OK to start Chrome headless (remote debugging on localhost) for screenshots, and to start a second backend process?

## Next actions (in order)
1. Get answers to Q1 to Q3, then record them in the plan.
2. Run DISC/ENV leftovers: ENV-002 (browser), ENV-004 (OCR availability).
3. Without needing login: DB-001..008 using `node UAT/tools/db-audit.mjs <dbname>` (SELECT/SHOW only), CR-001..008 static review, SEC static items.
4. After environment is ready: BE (auth matrix first), FE with screenshots, then INT/SYS/UAT, SEC dynamic, PERF.
5. Re-verify the 73 failures listed in `../uat-result.md` rather than trusting them; note it was run against code that was changing.
6. Write test-cases/*.md, code-review/*.md, uat-report.md, final coverage audit. Update this file and `qa-progress.md` after each phase.

## Technical context
- Run commands: `pnpm dev` (turbo) starts both; frontend 3100, API 3001 (`apps/backend/.env`, secrets never to be copied into reports). API prefix `api/v1`, auth routes under `api/auth`. Sessions are cookie-based; authorization is authority-based via `requireAuthority(req.actor, ...)` in `auth/session.ts`.
- No unit/e2e test framework in repo; `apps/backend/scripts/dev/e2e-write-flow.ts` and `mint-session.ts` exist (not run).
- Branch `angel`, large uncommitted change set; memory rules: never commit or push without asking.
