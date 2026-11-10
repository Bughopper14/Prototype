# Database Findings

Status: IN PROGRESS (DB-001..008). Read-only queries only. Environment: MySQL 8.0.46. Live DB queried: `crm-liugong` (SELECT/SHOW only). Fresh DB: `crm_qa`.
Credentials are not reproduced here.

| Finding ID | Category | Priority | Severity | Location | Description | Evidence | Recommendation | Effort | Status |
|---|---|---|---|---|---|---|---|---|---|
| DBF-001 | SECURITY | P1 | High | `apps/backend/.env` (DB_USER), `core/db/pool.ts` | The application connects as MySQL `root@localhost`, which has SUPER, DROP, CREATE USER, FILE, SHUTDOWN, GRANT OPTION on `*.*`. Any SQL injection or compromised backend gets full server control. | `SHOW GRANTS` on the app connection, 2026-11-10 | Create a dedicated app user limited to the app schema (SELECT/INSERT/UPDATE/DELETE, plus DDL only for a separate migration user). | Low | OPEN |
| DBF-002 | DATA MANAGEMENT | P3 | Low | live `crm-liugong` | 66 tables use `utf8mb4_0900_ai_ci`, 2 use `utf8mb4_unicode_ci`. Joins or comparisons across these can raise "illegal mix of collations" or skip indexes. | information_schema.tables | Standardize one collation. Identify the 2 tables in DB-002. | Low | OPEN |
| DBF-003 | TECHNICAL DEBT | P2 | Medium | `db/schema.sql` vs live | Live has 68 tables, a fresh `db:setup` gives 67 (live has extra `crm_users_legacy`), and the live schema is also being altered by runtime DDL (`*/initialize.ts`). Schema is not defined in one place. Fresh setup also creates 2 roles named "Super Admin" (ids 1 and 2). | table counts, `SELECT id, role_name FROM roles` on crm_qa | Move all DDL to versioned migrations. Check whether duplicate role is intended (portal app per role?). | Medium | NEEDS REVIEW |
| DBF-004 | DATA MANAGEMENT | P2 | Medium | `db:setup` / seed | A fresh install has zero rows in all `master_location_*` tables, so address dropdowns are empty until data is loaded by an undocumented step. | row counts in crm_qa after setup | Document or script the wilayah import, or fail setup loudly. | Low | OPEN |
| DBF-005 | DATA MANAGEMENT | P3 | Low | live `crm-liugong` | Reference dump `UAT/evidence/db-schema-dump.json` is stale (kecamatan 7196 vs 7287 now, kelurahan 83082 vs 83763). Not an app defect; do not use the dump for counts. | row counts | Re-pull in DB-001. | Low | OPEN |

Checks that came back clean (live): all 68 tables InnoDB, every table has a primary key, no duplicate usernames, no duplicate role names per app, password hashes are scrypt.
Not yet run: orphan checks (the first attempt used wrong column names: needs the real FK columns), duplicate NIB check, date-typed-as-text review, EXPLAIN review, trigger audit (134 triggers), schema.sql drift.
