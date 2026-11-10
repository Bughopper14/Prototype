import fs from 'node:fs';
const d = JSON.parse(fs.readFileSync('../evidence/db-schema-dump.json', 'utf8'));
const a = d['crm-liugong'], b = d['crm_test'];
const names = r => new Set(r.tables.map(t => t.name));
console.log('only in real:', [...names(a)].filter(x => !names(b).has(x)));
console.log('only in test:', [...names(b)].filter(x => !names(a).has(x)));
const colKey = r => new Set(r.columns.map(c => c.t + '.' + c.c + ':' + c.type));
console.log('cols only real:', [...colKey(a)].filter(x => !colKey(b).has(x)).slice(0, 20));
console.log('cols only test:', [...colKey(b)].filter(x => !colKey(a).has(x)).slice(0, 20));
console.log('triggers real', a.triggers.length, 'test', b.triggers.length);
const trigTables = r => { const m = {}; r.triggers.forEach(t => m[t.t] = (m[t.t] || 0) + 1); return m; };
const ta = trigTables(a), tb = trigTables(b);
console.log('trigger table diff:', Object.keys(ta).filter(k => ta[k] !== tb[k]).map(k => k + ' real=' + ta[k] + ' test=' + tb[k]));
for (const [db, r] of [['real', a]]) {
  const pk = new Set(r.columns.filter(c => c.k === 'PRI').map(c => c.t));
  console.log(db, 'tables without PK:', r.tables.filter(t => !pk.has(t.name)).map(t => t.name));
  const fkTables = new Set(r.fks.map(f => f.t));
  console.log(db, 'FK count', r.fks.length, 'tables with FK', fkTables.size);
  console.log(db, 'FK list:', r.fks.map(f => `${f.t}.${f.c}->${f.rt}.${f.rc}(${f.del})`).join('; ').slice(0, 1800));
  const cols = {}; r.columns.forEach(c => { if (c.col) cols[c.col] = (cols[c.col] || 0) + 1; });
  console.log(db, 'collations', cols);
  const eng = {}; r.tables.forEach(t => eng[t.engine] = (eng[t.engine] || 0) + 1); console.log(db, 'engines', eng);
  const big = Object.entries(r.counts).sort((x, y) => y[1] - x[1]).slice(0, 15); console.log(db, 'largest', big);
  const empty = Object.entries(r.counts).filter(([, n]) => n === 0).map(([t]) => t); console.log(db, 'empty tables', empty.length, empty.join(','));
  console.log(db, 'grants', r.grants);
}
