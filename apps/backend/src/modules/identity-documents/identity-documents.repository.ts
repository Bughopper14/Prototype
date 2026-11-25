import {Injectable} from '@nestjs/common';
import {CrmDatabase} from '../../core/db/crm-database';
import {CRM} from '../../core/db/crm-tables';

/** The identity documents of a stakeholder, by the name their file starts with (`<JENIS>_<application number>_<NNN>`, see documentBase). */
export const IDENTITY_FILE_PREFIX: Record<string, string> = {ktp: 'KTP_', npwp:'NPWPSTAKEHOLDER_', passport: 'PASSPORT_', kitas: 'KITAS_'};
export const IDENTITY_TYPES = Object.keys(IDENTITY_FILE_PREFIX);

/** Stakeholders and the files of their identity documents (crm_application_document_files.stakeholder_id). */
@Injectable()
export class IdentityDocumentsRepository {
  constructor(private readonly db: CrmDatabase) {}

  /** The application number of a saved stakeholder, or null when there is no such stakeholder. */
  async applicationNumberOf(stakeholderId: string): Promise<string | null> {
    const [rows] = await this.db.pool.execute<any[]>(
      `SELECT a.application_number FROM ${CRM.fapLegalStakeholders} s JOIN ${CRM.applications} a ON a.id=s.application_id AND a.deleted_at IS NULL WHERE s.id=?`,
      [stakeholderId],
    );
    return rows[0]?.application_number ?? null;
  }

  /** Records whose document a stored file is. */
  async setOwner(storagePath: string, stakeholderId: string) {
    await this.db.pool.execute(`UPDATE ${CRM.applicationDocumentFiles} SET stakeholder_id=? WHERE storage_path=?`, [stakeholderId, storagePath]);
  }

  /** The newest file of one identity document of a stakeholder. */
  async latestFile(stakeholderId: string, docType: string) {
    const [rows] = await this.db.pool.execute<any[]>(
      `SELECT file_name,storage_path,mime_type FROM ${CRM.applicationDocumentFiles}
       WHERE stakeholder_id=? AND deleted_at IS NULL AND file_name LIKE ? ORDER BY uploaded_at DESC,created_at DESC LIMIT 1`,
      [stakeholderId, `${IDENTITY_FILE_PREFIX[docType].replace(/_/g, '\\_')}%`],
    );
    return rows[0] ? {fileName: rows[0].file_name as string, storagePath: rows[0].storage_path as string, mimeType: rows[0].mime_type as string} : null;
  }
}
