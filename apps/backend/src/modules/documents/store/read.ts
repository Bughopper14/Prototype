/** Reads the documents and files of an application. */
import {pool} from '../../../core/db/pool';
import {fileModel} from './helpers';

export async function readDocumentFile(id: string) {
  if (!pool) return null;
  const [rows] = await pool.execute<any[]>('SELECT * FROM application_document_file WHERE id=?', [id]);
  return rows[0] ? fileModel(rows[0]) : null;
}
export async function readApplicationDocuments(id: string) {
  if (!pool) return [];
  const [rows] = await pool.execute<any[]>(
    'SELECT * FROM application_document_checklist WHERE application_id=? ORDER BY created_at,id',
    [id],
  );
  const [files] = await pool.execute<any[]>(
    'SELECT f.* FROM application_document_file f JOIN application_document_checklist d ON d.id=f.checklist_id WHERE d.application_id=? ORDER BY f.created_at',
    [id],
  );
  const date = (v: any) =>
    v instanceof Date
      ? `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`
      : v;
  return rows.map(d => ({
    id: d.id,
    applicationId: d.application_id,
    documentCode: d.document_code,
    documentName: d.document_name,
    assignedRole: d.assigned_role,
    isMandatory: !!d.is_mandatory,
    status: d.status,
    checkedByMkt: !!d.checked_by_mkt,
    checkedByBs: !!d.checked_by_bs,
    checkedByCa: !!d.checked_by_ca,
    checkedByLegal: !!d.checked_by_legal,
    registrationDate: date(d.registration_date),
    expiredDate: date(d.expired_date),
    dataSummary: d.data_summary,
    notes: d.notes,
    files: files.filter(f => f.checklist_id === d.id).map(fileModel),
  }));
}
