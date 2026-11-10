/** Column helpers and the stakeholder / deed row mapping. */
import {stakeholderFields} from '@liugong/shared';
import {storedDocumentUrl} from '@liugong/shared';
import {ageFromDateOfBirth} from '@liugong/shared';
import crypto from 'node:crypto';

export const col = (s: string) => s.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
const canonical = (v: any) =>
  JSON.stringify(v, (_k, x) =>
    x && typeof x === 'object' && !Array.isArray(x)
      ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b)))
      : x,
  );
export const asDate = (v: any) =>
  v instanceof Date ? v.toISOString().slice(0, 10) : v ? String(v).slice(0, 10) : null;
const numberFields = new Set(stakeholderFields.filter(f => f.type === 'number').map(f => col(f.key)));
const dateFields = new Set([
  ...stakeholderFields.filter(f => f.type === 'date').map(f => col(f.key)),
  'tanggal',
  'tanggal_akta',
  'tanggal_sk_menteri',
  'berlaku_sampai',
]);
const comparable = (key: string, value: any) =>
  value === null || value === undefined
    ? ''
    : numberFields.has(key)
      ? Number(value)
      : dateFields.has(key)
        ? asDate(value)
        : String(value);
export const mapStakeholder = (row: any) => {
  const docPath = row.document_path || '';
  const fileName = row.file_name || (docPath ? docPath.split(/[/\\]/).pop() : '');
  const idFolder = String(row.id_type || '').startsWith('PASSPORT') ? 'passport' : 'ktp';
  const fileUrl = storedDocumentUrl(docPath) || (fileName ? `/documents/${idFolder}/${fileName}` : null);
  return {
    ...Object.fromEntries(
      stakeholderFields.map(f => [f.key, f.type === 'date' ? asDate(row[col(f.key)]) : row[col(f.key)]]),
    ),
    ...ageFromDateOfBirth(asDate(row.date_of_birth)),
    district: row.district,
    village: row.village,
    id: row.id,
    name: [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' '),
    document_path: docPath,
    file_name: fileName,
    fileUrl: fileUrl,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const tableColumnsCache = new Map<string, Set<string>>();
async function getTableColumns(c: any, table: string): Promise<Set<string>> {
  let cols = tableColumnsCache.get(table);
  if (!cols) {
    const [rows] = await c.execute(`DESCRIBE \`${table}\``);
    cols = new Set(rows.map((r: any) => r.Field));
    tableColumnsCache.set(table, cols);
  }
  return cols;
}

export async function upsert(
  c: any,
  table: string,
  id: string,
  rawValues: Record<string, any>,
): Promise<string> {
  const validCols = await getTableColumns(c, table);
  const values: Record<string, any> = {};
  for (const [k, v] of Object.entries(rawValues)) {
    if (validCols.has(k)) {
      values[k] = v === '' || v === undefined ? null : v;
    }
  }
  let targetId = id;
  let [rows] = (await c.execute(`SELECT * FROM \`${table}\` WHERE id=? FOR UPDATE`, [targetId])) as any;
  if (rows[0] && values.application_id && rows[0].application_id !== values.application_id) {
    targetId = crypto.randomUUID();
    [rows] = (await c.execute(`SELECT * FROM \`${table}\` WHERE id=? FOR UPDATE`, [targetId])) as any;
  } else if (rows[0] && values.akta_id && rows[0].akta_id && rows[0].akta_id !== values.akta_id) {
    targetId = crypto.randomUUID();
    [rows] = (await c.execute(`SELECT * FROM \`${table}\` WHERE id=? FOR UPDATE`, [targetId])) as any;
  }
  const keys = Object.keys(values),
    old = rows[0];
  const changed =
    !old || Boolean(old.deleted_at) || keys.some(k => comparable(k, old[k]) !== comparable(k, values[k]));
  if (!changed) return targetId;
  if (old)
    await c.execute(
      `UPDATE \`${table}\` SET ${keys.map(k => '`' + k + '`=?').join(',')},deleted_at=NULL,updated_at=CURRENT_TIMESTAMP(3) WHERE id=?`,
      [...Object.values(values), targetId],
    );
  else
    await c.execute(
      `INSERT INTO \`${table}\` (id,${keys.map(k => '`' + k + '`').join(',')}) VALUES (${Array(
        keys.length + 1,
      )
        .fill('?')
        .join(',')})`,
      [targetId, ...Object.values(values)],
    );
  return targetId;
}
