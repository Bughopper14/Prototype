/**
 * Imports Pre-Analysis data from the legacy file store (<application-id>.json) into MySQL.
 *
 * A file is applied only when its application exists, its contents differ from the database row, and the file is
 * newer than the row. The replaced form_data is saved to storage/backups first.
 *
 * Usage: npm run import:pre-analysis -- <folder> [--apply]   (without --apply it only reports)
 */
import fs from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const folder = process.argv.slice(2).find(arg => !arg.startsWith('--'));
  const apply = process.argv.includes('--apply');
  if (!folder) throw new Error('Usage: npm run import:pre-analysis -- <folder> [--apply]');

  const {pool} = await import('@/lib/server/db/pool');
  const backups = path.resolve('storage/backups');
  if (apply) await fs.mkdir(backups, {recursive: true});

  for (const file of (await fs.readdir(folder)).filter(f => f.endsWith('.json'))) {
    const id = path.basename(file, '.json');
    const full = path.join(folder, file);
    const [apps] = await pool.query<any[]>('SELECT 1 FROM all_applications WHERE application_id = ?', [id]);
    if (!apps.length) { console.log(`skip   ${id}  (application is not in this database)`); continue; }

    const incoming = await fs.readFile(full, 'utf8');
    const [rows] = await pool.query<any[]>('SELECT form_data, updated_at FROM application_pre_analysis WHERE application_id = ?', [id]);
    const current = rows[0];
    const modified = (await fs.stat(full)).mtime;
    if (current && JSON.stringify(JSON.parse(current.form_data)) === JSON.stringify(JSON.parse(incoming))) { console.log(`same   ${id}`); continue; }
    if (current && current.updated_at && new Date(current.updated_at) >= modified) { console.log(`older  ${id}  (database row is newer, kept)`); continue; }

    console.log(`${apply ? 'apply ' : 'would '} ${id}  (file ${modified.toISOString()} vs row ${current?.updated_at?.toISOString?.() ?? 'none'})`);
    if (!apply) continue;
    if (current) await fs.writeFile(path.join(backups, `pre-analysis-${id}-${Date.now()}.json`), current.form_data);
    await pool.query(
      `INSERT INTO application_pre_analysis (application_id, form_data) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE form_data = VALUES(form_data)`, [id, JSON.stringify(JSON.parse(incoming))]);
  }
  await pool.end();
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
