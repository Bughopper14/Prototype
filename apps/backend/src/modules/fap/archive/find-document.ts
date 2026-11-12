/** Finds the stored file of the signed FAP document on crm_liugong1. */
import fs from 'node:fs';
import path from 'node:path';
import {pool} from '../../../core/db/pool';
import {documentsDir, filesDir} from '../../../core/storage';

export async function findFapDocumentPath(
  applicationId: string,
): Promise<{fileId: string | null; filePath: string | null; fileName: string | null}> {
  if (!pool) return {fileId: null, filePath: null, fileName: null};
  try {
    const [rows] = await pool.query<any[]>(
      `SELECT f.id, f.file_name, f.storage_key AS file_key, f.storage_path,
              dt.code AS document_code, dt.name AS document_name
       FROM crm_application_document_files f
       JOIN crm_application_document_checklists c ON c.id = f.checklist_id
       JOIN crm_master_document_types dt ON dt.id = c.document_type_id
       WHERE f.application_id = ?
         AND f.deleted_at IS NULL
         AND (UPPER(dt.code) = 'FAP' OR LOWER(dt.name) LIKE '%fap%')
       ORDER BY f.is_current_active DESC, f.uploaded_at DESC
       LIMIT 1`,
      [applicationId],
    );

    if (!rows.length) return {fileId: null, filePath: null, fileName: null};
    const row = rows[0];
    const fileId = row.id || null;
    const fileName = row.file_name || null;
    const fileKey = row.file_key || row.id || null;

    if (row.storage_path && fs.existsSync(row.storage_path)) {
      return {fileId, filePath: path.resolve(row.storage_path), fileName};
    }

    const possibleDirs = [documentsDir, filesDir];

    if (fileKey) {
      for (const d of possibleDirs) {
        const full = path.join(d, fileKey);
        if (fs.existsSync(full)) {
          return {fileId, filePath: path.resolve(full), fileName: fileName || fileKey};
        }
      }
    }

    if (fileName) {
      for (const d of possibleDirs) {
        const full = path.join(d, fileName);
        if (fs.existsSync(full)) {
          return {fileId, filePath: path.resolve(full), fileName};
        }
      }

      const clean = fileName.split('_[')[0];
      for (const d of possibleDirs) {
        try {
          if (fs.existsSync(d)) {
            const list = fs.readdirSync(d);
            const match = list.find(f => f.startsWith(clean));
            if (match) {
              return {fileId, filePath: path.resolve(path.join(d, match)), fileName: match};
            }
          }
        } catch {}
      }
    }

    return {
      fileId,
      filePath: row.storage_path || (fileKey ? path.join(documentsDir, fileKey) : null),
      fileName,
    };
  } catch (e) {
    console.warn('findFapDocumentPath error:', e);
    return {fileId: null, filePath: null, fileName: null};
  }
}
