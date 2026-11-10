# QA Progress Tracker

Last updated: 2026-11-10 (session 1). Wilayah masters copied into crm_qa (Q4 approved).

| Task ID | Task | Status | Findings | Evidence | Notes |
|---|---|---|---|---|---|
| DISC-001 | Inspect project structure and stack | COMPLETED | 0 | qa-execution-plan.md | Monorepo: React/Vite, NestJS, MySQL, Python OCR |
| DISC-002 | Inventory frontend routes | COMPLETED | 12 routes | application-inventory.md | From App.tsx |
| DISC-003 | Inventory backend endpoints | COMPLETED | 84 decorator lines, ~75 endpoints | application-inventory.md | Grep of controllers; not yet runtime-verified |
| DISC-004 | Inventory database objects | COMPLETED | 68 tables in crm-liugong | evidence/db-schema-dump.json | Dump pre-dates this session (from earlier run); must be re-pulled read-only in DB-001 |
| DISC-005 | Review prior uat-result.md | COMPLETED | 73 prior failures (leads) | ../uat-result.md | Needs re-verification |
| DISC-006 | Startup/env/config review | COMPLETED | 0 | plan section 2 | Secrets not recorded |
| ENV-001 | Confirm running services | COMPLETED | 0 | plan section 2 | FE :3100 up, API health OK via proxy, MySQL :3306 up |
| ENV-002 | Browser tooling for screenshots | NOT STARTED | - | - | Chrome 157 present, will use CDP |
| ENV-003 | Agree safe test environment and accounts | COMPLETED | 1 (fresh `db:setup` leaves location masters empty) | evidence/qa-backend.log | crm_qa on API 3201 / UI 3200, user qa-admin |
| ENV-004 | OCR service availability | NOT STARTED | - | - | |
| DB-001 | Re-pull schema read-only | IN PROGRESS | DBF-002..005 | database-findings.md | tools/db-audit.mjs exists (SELECT only) |
| DB-002 | FK/index/check/trigger audit | NOT STARTED | - | - | |
| DB-003 | Integrity queries | IN PROGRESS | - | code-review/database-findings.md | orphan/dup queries need correct column names |
| DB-004 | schema.sql/seed vs live DB drift | NOT STARTED | - | - | |
| DB-005 | Runtime DDL review (initialize.ts) | NOT STARTED | - | - | |
| DB-006 | Query/EXPLAIN review | NOT STARTED | - | - | |
| DB-007 | DB privileges and secrets | COMPLETED | 1 (DBF-001) | database-findings.md | app uses root |
| DB-008 | Static vs DB data | NOT STARTED | - | - | |
| CR-001..008 | Code review set | NOT STARTED | - | - | |
| FE-001..014 | Frontend module testing | NOT STARTED | - | - | ENV-003 done, ready |
| BE-001..016 | Backend endpoint testing | NOT STARTED | - | - | Ready |
| INT / SYS / UAT | Integration, system, UAT | NOT STARTED | - | - | ENV-003 done, ready |
| SEC-001..012 | Security testing | NOT STARTED | - | - | Static parts can start now; dynamic parts blocked |
| PERF-001..006 | Performance | NOT STARTED | - | - | ENV-003 done, ready |
| DOC-001..006 | Reports and coverage audit | NOT STARTED | - | - | |

No test has been executed yet. Pass/fail counts: 0 executed.
