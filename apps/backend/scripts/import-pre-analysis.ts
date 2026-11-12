/**
 * Imports Pre-Analysis data from the legacy file store (<application-id>.json) into MySQL (crm_liugong1).
 *
 * Usage: pnpm import:pre-analysis -- <folder> [--apply]   (without --apply it only reports)
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {pool} from '../src/core/db/pool';
import {getPreAnalysisData, savePreAnalysisData} from '../src/modules/pre-analysis/pre-analysis.repository';

async function main() {
  const folder = process.argv.slice(2).find(arg => !arg.startsWith('--'));
  const apply = process.argv.includes('--apply');
  if (!folder) throw new Error('Usage: pnpm import:pre-analysis -- <folder> [--apply]');

  const backups = path.resolve('storage/backups');
  if (apply) await fs.mkdir(backups, {recursive: true});

  for (const file of (await fs.readdir(folder)).filter(f => f.endsWith('.json'))) {
    const id = path.basename(file, '.json');
    const full = path.join(folder, file);
    const [apps] = await pool.query<any[]>('SELECT 1 FROM crm_applications WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!apps.length) {
      console.log(`skip   ${id}  (application is not in this database)`);
      continue;
    }

    const incoming = await fs.readFile(full, 'utf8');
    const [rows] = await pool.query<any[]>(
      'SELECT id, updated_at FROM crm_pre_analysis_forms WHERE application_id = ? AND deleted_at IS NULL LIMIT 1',
      [id],
    );
    const current = rows[0];
    const modified = (await fs.stat(full)).mtime;
    if (current && current.updated_at && new Date(current.updated_at) >= modified) {
      console.log(`older  ${id}  (database row is newer, kept)`);
      continue;
    }

    console.log(
      `${apply ? 'apply ' : 'would '} ${id}  (file ${modified.toISOString()} vs row ${current?.updated_at?.toISOString?.() ?? 'none'})`,
    );
    if (!apply) continue;
    if (current) {
      const existingData = await getPreAnalysisData(id);
      await fs.writeFile(
        path.join(backups, `pre-analysis-${id}-${Date.now()}.json`),
        JSON.stringify(existingData, null, 2),
      );
    }
    await savePreAnalysisData(id, JSON.parse(incoming), 'import-pre-analysis');
  }
  await pool.end();
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
