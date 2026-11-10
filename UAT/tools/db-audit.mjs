// READ-ONLY database audit: only SELECT / SHOW / information_schema / EXPLAIN. Credentials come from apps/backend/.env and are never printed.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const req = createRequire('C:/Users/LFI_M/Documents/prototype-src/apps/backend/package.json');
const mysql = req('mysql2/promise');
const env = Object.fromEntries(fs.readFileSync('C:/Users/LFI_M/Documents/prototype-src/apps/backend/.env', 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#') && l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const out = {};
for (const db of process.argv.slice(2)) {
  const c = await mysql.createConnection({host: env.DB_HOST, port: Number(env.DB_PORT || 3306), user: env.DB_USER, password: env.DB_PASSWORD, database: db});
  const q = async (sql, p) => (await c.query(sql, p))[0];
  const r = {};
  r.version = (await q('SELECT VERSION() v'))[0].v;
  r.tables = await q("SELECT table_name name, table_type type, engine, table_rows approx_rows, table_collation collation FROM information_schema.tables WHERE table_schema=DATABASE() ORDER BY table_name");
  r.columns = await q("SELECT table_name t, column_name c, column_type type, is_nullable nullable, column_default def, column_key k, extra, character_set_name cs, collation_name col FROM information_schema.columns WHERE table_schema=DATABASE() ORDER BY table_name, ordinal_position");
  r.fks = await q("SELECT k.table_name t, k.column_name c, k.referenced_table_name rt, k.referenced_column_name rc, k.constraint_name n, rc.delete_rule del, rc.update_rule upd FROM information_schema.key_column_usage k JOIN information_schema.referential_constraints rc ON rc.constraint_name=k.constraint_name AND rc.constraint_schema=k.constraint_schema WHERE k.table_schema=DATABASE() AND k.referenced_table_name IS NOT NULL ORDER BY k.table_name");
  r.indexes = await q("SELECT table_name t, index_name i, non_unique nu, GROUP_CONCAT(column_name ORDER BY seq_in_index) cols FROM information_schema.statistics WHERE table_schema=DATABASE() GROUP BY table_name, index_name, non_unique ORDER BY table_name");
  r.checks = await q("SELECT tc.table_name t, tc.constraint_name n, cc.check_clause clause FROM information_schema.table_constraints tc JOIN information_schema.check_constraints cc ON cc.constraint_name=tc.constraint_name AND cc.constraint_schema=tc.constraint_schema WHERE tc.table_schema=DATABASE() AND tc.constraint_type='CHECK'").catch(() => []);
  r.triggers = await q("SELECT trigger_name n, event_object_table t, action_timing a, event_manipulation e FROM information_schema.triggers WHERE trigger_schema=DATABASE()");
  r.routines = await q("SELECT routine_name n, routine_type t FROM information_schema.routines WHERE routine_schema=DATABASE()");
  r.views = await q("SELECT table_name n FROM information_schema.views WHERE table_schema=DATABASE()");
  r.counts = {};
  for (const t of r.tables.filter(t => t.type === 'BASE TABLE')) { r.counts[t.name] = (await q('SELECT COUNT(*) n FROM `' + t.name + '`'))[0].n; }
  r.grants = await q('SHOW GRANTS FOR CURRENT_USER()').then(rows => rows.map(x => Object.values(x)[0].replace(/IDENTIFIED BY.*/, 'IDENTIFIED BY <redacted>'))).catch(() => []);
  out[db] = r;
  await c.end();
}
fs.writeFileSync('C:/Users/LFI_M/Documents/prototype-src/UAT/evidence/db-schema-dump.json', JSON.stringify(out, null, 1));
for (const [db, r] of Object.entries(out)) console.log(db, r.version, 'tables', r.tables.length, 'cols', r.columns.length, 'fks', r.fks.length, 'idx', r.indexes.length, 'checks', r.checks.length, 'triggers', r.triggers.length, 'routines', r.routines.length, 'views', r.views.length);
