/** Finds the stored file of the signed FAP document. */
import {pool} from '../../../core/db/pool';
import {filesDir, documentsDir} from '../../../core/storage';
import path from 'node:path';
import fs from 'node:fs';

export async function findFapDocumentPath(
  applicationId: string,
): Promise<{filePath: string | null; fileName: string | null}> {
  if (!pool) return {filePath: null, fileName: null};
  try {
    const [rows] = await pool.query<any[]>(
      `
      SELECT f.id, f.file_name, f.file_key, c.document_code, c.document_name
      FROM application_document_file f
      JOIN application_document_checklist c ON c.id = f.checklist_id
      WHERE c.application_id = ?
        AND (UPPER(c.document_code) = 'FAP' OR LOWER(c.document_name) LIKE '%fap%')
      ORDER BY f.created_at DESC
      LIMIT 1
    `,
      [applicationId],
    );

    if (!rows.length) return {filePath: null, fileName: null};
    const row = rows[0];
    const fileName = row.file_name || null;
    const fileKey = row.file_key || row.id || null;

    const possibleDirs = [filesDir, documentsDir];

    if (fileName) {
      for (const d of possibleDirs) {
        const full = path.join(d, fileName);
        if (fs.existsSync(full)) {
          return {filePath: path.resolve(full), fileName};
        }
      }

      const clean = fileName.split('_[')[0];
      for (const d of possibleDirs) {
        try {
          if (fs.existsSync(d)) {
            const list = fs.readdirSync(d);
            const match = list.find(f => f.startsWith(clean));
            if (match) {
              return {filePath: path.resolve(path.join(d, match)), fileName: match};
            }
          }
        } catch {}
      }
    }

    if (fileKey) {
      for (const d of possibleDirs) {
        const full = path.join(d, fileKey);
        if (fs.existsSync(full)) {
          return {filePath: path.resolve(full), fileName: fileName || fileKey};
        }
      }
    }

    return {filePath: fileName ? path.join(documentsDir, fileName) : null, fileName};
  } catch (e) {
    console.warn('findFapDocumentPath error:', e);
    return {filePath: null, fileName: null};
  }
}
