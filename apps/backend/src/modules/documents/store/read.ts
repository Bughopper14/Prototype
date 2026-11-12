/** Read checklist & document file records from crm_application_document_checklists and crm_application_document_files. */
import {pool} from '../../../core/db/pool';
import {dateStr} from '../../applications/intake/helpers';
import {fileModel} from './helpers';

export async function readDocumentFile(id: string) {
  const [rows] = await pool.query<any[]>(
    'SELECT * FROM crm_application_document_files WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [id],
  );
  return rows[0] ? fileModel(rows[0]) : null;
}

export async function readApplicationDocuments(id: string) {
  const [checkRows] = await pool.query<any[]>(
    `SELECT chk.*,
            dt.code AS dt_code, dt.name AS dt_name, dt.title AS dt_title,
            dt.department_code, dt.default_section, dt.description AS dt_description,
            dt.sort_order
     FROM crm_application_document_checklists chk
     JOIN crm_master_document_types dt ON dt.id = chk.document_type_id
     WHERE chk.application_id = ?
     ORDER BY dt.sort_order ASC, dt.code ASC`,
    [id],
  );

  const [fileRows] = await pool.query<any[]>(
    `SELECT * FROM crm_application_document_files
     WHERE application_id = ? AND deleted_at IS NULL AND is_current_active = 1
     ORDER BY version_number DESC, uploaded_at DESC`,
    [id],
  );

  const filesByChecklist = new Map<string, any[]>();
  for (const f of fileRows) {
    const list = filesByChecklist.get(f.checklist_id) || [];
    list.push(fileModel(f));
    filesByChecklist.set(f.checklist_id, list);
  }

  return checkRows.map(chk => ({
    id: chk.id,
    chkId: chk.id,
    applicationId: chk.application_id,
    documentTypeId: chk.document_type_id,
    code: chk.dt_code,
    documentCode: chk.dt_code,
    name: chk.dt_name,
    documentName: chk.dt_name,
    title: chk.dt_title || chk.dt_name,
    department: chk.department_code || chk.assigned_role,
    assignedRole: chk.assigned_role,
    section: chk.default_section || '',
    description: chk.dt_description || '',
    mandatory: Boolean(chk.is_mandatory),
    isMandatory: Boolean(chk.is_mandatory),
    status: chk.status,
    checkedByMkt: Boolean(chk.checked_by_mkt),
    checkedByBs: Boolean(chk.checked_by_bs),
    checkedByCa: Boolean(chk.checked_by_ca),
    checkedByLegal: Boolean(chk.checked_by_legal),
    registrationDate: dateStr(chk.registration_date) || '',
    expiredDate: dateStr(chk.expired_date) || '',
    dataSummary: chk.data_summary || '',
    notes: chk.notes || '',
    files: filesByChecklist.get(chk.id) || [],
  }));
}

export const readChecklistForApplication = readApplicationDocuments;
