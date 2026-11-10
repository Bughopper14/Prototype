/** Uploading, deleting and verifying document files. */
import {pool} from '../../../core/db/pool';
import {ensure} from '../../../core/domain';
import crypto from 'node:crypto';
import path from 'node:path';
import {syncSubmitLock} from './submit-lock';

export async function uploadApplicationDocument(
  id: string,
  checklistId: string,
  file: any,
  actorId: string,
  store: (key: string) => Promise<void>,
) {
  const c = await pool!.getConnection();
  try {
    await c.beginTransaction();
    const [apps] = await c.execute<any[]>(
      'SELECT p.application_status FROM all_applications a JOIN new_application_pre_analisis p ON p.id_pre_analysis=a.id_pre_analysis WHERE a.application_id=? FOR UPDATE',
      [id],
    );
    ensure(apps.length, 'Application not found', 404);
    ensure(
      !['APPROVED', 'REJECTED', 'CREDIT_COMMITTEE_REVIEW'].includes(apps[0].application_status),
      'Documents are locked at this stage',
      409,
    );
    let [docs] = await c.execute<any[]>(
      'SELECT id FROM application_document_checklist WHERE id=? AND application_id=? FOR UPDATE',
      [checklistId, id],
    );
    if (!docs.length) {
      [docs] = await c.execute<any[]>(
        'SELECT id FROM application_document_checklist WHERE (document_code=? OR UPPER(document_code)=? OR document_name=?) AND application_id=? FOR UPDATE',
        [checklistId, checklistId.toUpperCase(), checklistId, id],
      );
    }
    if (!docs.length && (checklistId.toUpperCase().includes('FAP') || checklistId.includes('demo-doc-'))) {
      [docs] = await c.execute<any[]>(
        'SELECT id FROM application_document_checklist WHERE UPPER(document_code)="FAP" AND application_id=? FOR UPDATE',
        [id],
      );
    }
    ensure(docs.length, 'Checklist item not found', 404);
    const targetChecklistId = docs[0].id;
    const key = crypto.randomUUID(),
      fileId = crypto.randomUUID();
    await store(key);
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const appHash = crypto.createHash('md5').update(id).digest('hex').substring(0, 6).toUpperCase();
    const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const storedFileName = file.originalname.includes(appHash)
      ? file.originalname
      : `${base}_[${appHash}]_${nowStr}${ext}`;
    await c.execute(
      'INSERT INTO application_document_file (id,checklist_id,file_name,file_key,file_size,mime_type,uploaded_by) VALUES (?,?,?,?,?,?,?)',
      [fileId, targetChecklistId, storedFileName, key, file.size, file.mimetype, actorId],
    );
    await c.execute(
      "UPDATE application_document_checklist SET status='UPLOADED',checked_by_mkt=1,checked_by_bs=0,checked_by_ca=0,checked_by_legal=0,updated_at=CURRENT_TIMESTAMP(3) WHERE id=?",
      [targetChecklistId],
    );
    await c.commit();
    try {
      await syncSubmitLock(id);
    } catch {}
    return {
      id: fileId,
      checklistId: targetChecklistId,
      fileName: storedFileName,
      fileKey: key,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedBy: actorId,
    };
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
  }
}
export async function deleteApplicationDocumentFile(
  id: string,
  fileId: string,
  removeStoredFile: (key: string) => Promise<void>,
) {
  const c = await pool!.getConnection();
  try {
    await c.beginTransaction();
    const [apps] = await c.execute<any[]>(
      'SELECT p.application_status FROM all_applications a JOIN new_application_pre_analisis p ON p.id_pre_analysis=a.id_pre_analysis WHERE a.application_id=? FOR UPDATE',
      [id],
    );
    ensure(apps.length, 'Application not found', 404);
    ensure(
      !['APPROVED', 'REJECTED', 'CREDIT_COMMITTEE_REVIEW'].includes(apps[0].application_status),
      'Documents are locked at this stage',
      409,
    );
    const [files] = await c.execute<any[]>(
      `SELECT f.id,f.file_key,f.checklist_id FROM application_document_file f
   JOIN application_document_checklist d ON d.id=f.checklist_id
   WHERE f.id=? AND d.application_id=? FOR UPDATE`,
      [fileId, id],
    );
    ensure(files.length, 'File not found in this application', 404);
    const file = files[0];
    await c.execute('DELETE FROM application_document_file WHERE id=?', [fileId]);
    const [remaining] = await c.execute<any[]>(
      'SELECT id FROM application_document_file WHERE checklist_id=? LIMIT 1',
      [file.checklist_id],
    );
    await c.execute(
      `UPDATE application_document_checklist SET status=?,checked_by_mkt=?,checked_by_bs=0,
   checked_by_ca=0,checked_by_legal=0,registration_date=NULL,expired_date=NULL,data_summary=NULL,notes=NULL,
   updated_at=CURRENT_TIMESTAMP(3) WHERE id=?`,
      [remaining.length ? 'UPLOADED' : 'PENDING', remaining.length ? 1 : 0, file.checklist_id],
    );
    await removeStoredFile(file.file_key);
    await c.commit();
    try {
      await syncSubmitLock(id);
      const [fapFiles] = await pool!.execute<any[]>(
        `
      SELECT COUNT(f.id) AS cnt
      FROM application_document_checklist d
      JOIN application_document_file f ON f.checklist_id = d.id
      WHERE d.application_id = ?
        AND (UPPER(d.document_code) = 'FAP' OR LOWER(d.document_name) LIKE '%fap%')
    `,
        [id],
      );
      if (Number(fapFiles[0]?.cnt || 0) === 0) {
        await pool!.execute(
          'UPDATE application_submit_lock SET ocr_comparison_json = NULL, fap_doc_uploaded = 0, is_locked = 1 WHERE application_id = ?',
          [id],
        );
      }
    } catch {}
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
  }
}
export async function verifyApplicationDocument(id: string, checklistId: string, body: any, isAdmin = false) {
  const c = await pool!.getConnection();
  try {
    await c.beginTransaction();
    const [apps] = await c.execute<any[]>(
      'SELECT p.application_status FROM all_applications a JOIN new_application_pre_analisis p ON p.id_pre_analysis=a.id_pre_analysis WHERE a.application_id=? FOR UPDATE',
      [id],
    );
    ensure(apps.length, 'Application not found', 404);
    ensure(
      isAdmin ||
        (body.department === 'BS'
          ? apps[0].application_status === 'SUBMITTED_TO_BS'
          : apps[0].application_status === 'IN_CA_LEGAL_REVIEW'),
      'Verification is unavailable at this workflow stage',
      409,
    );
    const [docs] = await c.execute<any[]>(
      'SELECT * FROM application_document_checklist WHERE id=? AND application_id=? FOR UPDATE',
      [checklistId, id],
    );
    ensure(docs.length, 'Checklist item not found', 404);
    const [files] = await c.execute<any[]>(
      'SELECT id FROM application_document_file WHERE checklist_id=? LIMIT 1',
      [checklistId],
    );
    ensure(files.length, 'Upload a document before verification');
    if (body.isVerified && body.expiredDate)
      ensure(
        body.expiredDate >= new Date().toISOString().slice(0, 10),
        'An expired document cannot be verified',
      );
    if (body.expiredDate && body.registrationDate)
      ensure(body.expiredDate >= body.registrationDate, 'Expiry must follow registration');
    const column = {BS: 'checked_by_bs', CA: 'checked_by_ca', LEGAL: 'checked_by_legal'}[
      body.department as 'BS' | 'CA' | 'LEGAL'
    ];
    ensure(column, 'Invalid department');
    await c.execute(
      `UPDATE application_document_checklist SET ${column}=?,status=?,registration_date=?,expired_date=?,data_summary=?,notes=?,updated_at=CURRENT_TIMESTAMP(3) WHERE id=?`,
      [
        body.isVerified,
        body.department === docs[0].assigned_role
          ? body.isVerified
            ? 'VERIFIED'
            : 'REJECTED'
          : docs[0].status,
        body.registrationDate ?? null,
        body.expiredDate ?? null,
        body.dataSummary ?? '',
        body.notes ?? '',
        checklistId,
      ],
    );
    await c.commit();
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
  }
}
