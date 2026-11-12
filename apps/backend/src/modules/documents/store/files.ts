/** Upload, delete, and verify application document checklist files on crm_liugong1. */
import crypto from 'node:crypto';
import {cleanNullableString} from '../../../core/db/crm-lookups';
import {pool} from '../../../core/db/pool';
import {Problem} from '../../../core/domain';
import {dateStr} from '../../applications/intake/helpers';
import {fileModel} from './helpers';
import {readApplicationDocuments} from './read';
import {syncSubmitLock} from './submit-lock';

export async function uploadApplicationDocument(
  applicationId: string,
  params: {
    checklistId?: string;
    code?: string;
    fileName: string;
    fileKey: string;
    storedPath?: string;
    fileSize: number;
    mimeType: string;
    uploadedBy: string;
    notes?: string;
    registrationDate?: string;
    expiredDate?: string;
    dataSummary?: string;
  },
) {
  let checklistId = cleanNullableString(params.checklistId);
  if (!checklistId && params.code) {
    const [chkRows] = await pool.query<any[]>(
      `SELECT chk.id
       FROM crm_application_document_checklists chk
       JOIN crm_master_document_types dt ON dt.id = chk.document_type_id
       WHERE chk.application_id = ? AND dt.code = ?
       LIMIT 1`,
      [applicationId, String(params.code).trim().toUpperCase()],
    );
    checklistId = chkRows[0]?.id ?? null;
  }
  if (!checklistId) {
    throw new Problem(404, `Checklist item not found for application ${applicationId}.`);
  }

  const [verRows] = await pool.query<any[]>(
    'SELECT COALESCE(MAX(version_number), 0) AS max_ver FROM crm_application_document_files WHERE checklist_id = ?',
    [checklistId],
  );
  const versionNumber = Number(verRows[0]?.max_ver || 0) + 1;
  const fileId = crypto.randomUUID();
  const actor = String(params.uploadedBy || 'System').slice(0, 150);

  await pool.execute(
    `INSERT INTO crm_application_document_files (
      id, checklist_id, application_id, version_number, file_name, storage_key, storage_path,
      file_size, mime_type, is_current_active, uploaded_by, uploaded_at, created_by, updated_by
    ) VALUES (?,?,?,?,?,?,?,?,?,1,?,CURRENT_TIMESTAMP(3),?,?)`,
    [
      fileId,
      checklistId,
      applicationId,
      versionNumber,
      params.fileName.slice(0, 255),
      params.fileKey.slice(0, 255),
      params.storedPath ? params.storedPath.slice(0, 500) : null,
      Math.max(0, Math.trunc(params.fileSize || 0)),
      (params.mimeType || 'application/octet-stream').slice(0, 100),
      actor,
      actor,
      actor,
    ],
  );

  await pool.execute(
    `UPDATE crm_application_document_checklists
     SET status = CASE WHEN status = 'PENDING' THEN 'UPLOADED' ELSE status END,
         notes = COALESCE(?, notes),
         registration_date = COALESCE(?, registration_date),
         expired_date = COALESCE(?, expired_date),
         data_summary = COALESCE(?, data_summary),
         updated_at = CURRENT_TIMESTAMP(3),
         updated_by = ?
     WHERE id = ? AND application_id = ?`,
    [
      cleanNullableString(params.notes),
      dateStr(params.registrationDate),
      dateStr(params.expiredDate),
      cleanNullableString(params.dataSummary),
      actor,
      checklistId,
      applicationId,
    ],
  );

  await syncSubmitLock(applicationId);
  const [rows] = await pool.query<any[]>('SELECT * FROM crm_application_document_files WHERE id = ?', [fileId]);
  return rows[0] ? fileModel(rows[0]) : null;
}

export async function deleteApplicationDocumentFile(applicationId: string, fileId: string, actorName = 'System') {
  const [rows] = await pool.query<any[]>(
    'SELECT * FROM crm_application_document_files WHERE id = ? AND application_id = ? AND deleted_at IS NULL LIMIT 1',
    [fileId, applicationId],
  );
  const file = rows[0];
  if (!file) throw new Problem(404, 'Document file not found.');

  await pool.execute(
    `UPDATE crm_application_document_files
     SET deleted_at = CURRENT_TIMESTAMP(3), is_current_active = 0, updated_at = CURRENT_TIMESTAMP(3), updated_by = ?
     WHERE id = ?`,
    [actorName.slice(0, 150), fileId],
  );

  const [remRows] = await pool.query<any[]>(
    `SELECT COUNT(*) AS cnt FROM crm_application_document_files
     WHERE checklist_id = ? AND deleted_at IS NULL AND is_current_active = 1`,
    [file.checklist_id],
  );
  if (Number(remRows[0]?.cnt || 0) === 0) {
    await pool.execute(
      `UPDATE crm_application_document_checklists
       SET status = 'PENDING', updated_at = CURRENT_TIMESTAMP(3), updated_by = ?
       WHERE id = ?`,
      [actorName.slice(0, 150), file.checklist_id],
    );
  }

  await syncSubmitLock(applicationId);
  return fileModel(file);
}

export async function verifyApplicationDocument(
  applicationId: string,
  checklistId: string,
  body: any,
  isAdmin = false,
) {
  const dept = String(body?.department || body?.role || (isAdmin ? 'MKT' : '')).toUpperCase();
  const checked = body?.checked === undefined ? undefined : body.checked ? 1 : 0;
  const deptCol =
    dept === 'MKT'
      ? 'checked_by_mkt'
      : dept === 'BS'
        ? 'checked_by_bs'
        : dept === 'CA'
          ? 'checked_by_ca'
          : dept === 'LEGAL'
            ? 'checked_by_legal'
            : null;

  const sets: string[] = ['updated_at = CURRENT_TIMESTAMP(3)'];
  const params: any[] = [];
  if (deptCol && checked !== undefined) {
    sets.push(`${deptCol} = ?`);
    params.push(checked);
  }
  if (body?.status && ['PENDING', 'UPLOADED', 'VERIFIED', 'REJECTED'].includes(String(body.status).toUpperCase())) {
    sets.push('status = ?');
    params.push(String(body.status).toUpperCase());
  } else if (checked === 1) {
    sets.push(`status = 'VERIFIED'`);
  }
  if (body?.notes !== undefined) {
    sets.push('notes = ?');
    params.push(cleanNullableString(body.notes));
  }
  await pool.execute(
    `UPDATE crm_application_document_checklists SET ${sets.join(', ')} WHERE id = ? AND application_id = ?`,
    [...params, checklistId, applicationId],
  );
  return readApplicationDocuments(applicationId);
}
