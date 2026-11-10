/** Workflow transitions of an application. */
import {pool} from '../../../core/db/pool';
import {getSubmitLock} from '../../documents/documents.repository';
import {mysqlError, picColumn} from './helpers';
import {intakeDetail} from './detail';

export async function transitionIntake(
  id: string,
  action: string,
  actor: {name: string; role: string; isAdmin?: boolean; authorities?: string[]},
  comments: string = '',
) {
  if (!pool) throw mysqlError('MySQL is not configured', 503);
  const detail = await intakeDetail(id);
  if (!detail) throw mysqlError('Application not found', 404);

  const isAdmin = actor.role === 'ADMIN' || Boolean((actor as any).isAdmin);
  const can = (authority: string) => isAdmin || (actor.authorities || []).includes(authority);
  let currentStatus = detail.status || 'DRAFT';

  if (action === 'SUBMIT_TO_BS') {
    if (!can('crm_workflow_submit')) {
      throw mysqlError('Hanya tim Marketing yang dapat mengajukan ke Branch Support', 403);
    }
    if (!['DRAFT', 'RETURNED'].includes(currentStatus)) {
      throw mysqlError('Hanya aplikasi dengan status DRAFT atau RETURNED yang dapat diajukan', 409);
    }

    // 1. Check mandatory constraints from mandatory table
    const [mandatoryList] = await pool.query<any[]>(
      'SELECT section, field_key, field_label, mandatory FROM master_mandatory WHERE mandatory = 1',
    );
    const picMandatory = mandatoryList
      .filter(
        m =>
          m.section === 'Primary Contact (PIC)' ||
          m.section.includes('PIC') ||
          m.section.includes('Primary Contact'),
      )
      .map(m => m.field_key);
    if (picMandatory.length) {
      const [picRows] = await pool.execute<any[]>('SELECT * FROM customer_pic WHERE application_id = ?', [
        id,
      ]);
      const picRow = picRows[0];
      for (const key of picMandatory) {
        const col = picColumn(key);
        if (!picRow || !String(picRow[col] || '').trim()) {
          throw mysqlError(
            `Bagian Customer & PIC (${key}) wajib diisi dan disimpan sebelum submit ke BS.`,
            422,
          );
        }
      }
    }

    // 5. Check Document Checklist mandatory constraint
    const [docRows] = await pool.execute<any[]>(
      `SELECT adc.document_name 
    FROM application_document_checklist adc 
    LEFT JOIN application_document_file adf ON adf.checklist_id = adc.id 
    WHERE adc.application_id = ? AND adc.is_mandatory = 1 
    GROUP BY adc.id, adc.document_name 
    HAVING COUNT(adf.id) = 0`,
      [id],
    );
    const submitLock = await getSubmitLock(id);
    if (submitLock.isLocked) {
      throw mysqlError('Please upload the signed FAP Stage document in the Documents tab first.', 422);
    }
    if (docRows.length > 0) {
      const missingDocNames = docRows.map((r: any) => r.document_name).join(', ');
      throw mysqlError(`Unggah dokumen wajib terlebih dahulu: ${missingDocNames}`, 422);
    }

    // 6. Check Legal deeds & total percentage share constraint before submit
    const [deedRows] = await pool.execute<any[]>(
      'SELECT id, akta, nomor_akta, total_kepemilikan FROM daftar_akta WHERE application_id = ? AND deleted_at IS NULL',
      [id],
    );
    if (!deedRows.length) {
      throw mysqlError('Minimal harus ada 1 akta (Akta pendirian) sebelum diajukan ke BS.', 422);
    }
    for (const d of deedRows) {
      const total = Number(d.total_kepemilikan || 0);
      if (Math.abs(total - 100) > 0.01) {
        throw mysqlError(
          `Total kepemilikan saham pada ${d.akta} (${d.nomor_akta || 'tanpa nomor'}) wajib tepat 100% sebelum submit ke BS. Saat ini ${total.toFixed(2)}%.`,
          422,
        );
      }
    }

    // All mandatory checks passed (or optional if is_mandatory=0)
    currentStatus = 'SUBMITTED_TO_BS';
  } else if (action === 'VERIFY_BS') {
    if (!can('crm_workflow_verify_documents'))
      throw mysqlError('Akun ini tidak dapat memverifikasi berkas', 403);
    currentStatus = 'BS_VERIFIED';
  } else if (action === 'START_REVIEW') {
    if (!can('crm_workflow_start_review')) throw mysqlError('Akun ini tidak dapat memulai review', 403);
    currentStatus = 'IN_CA_LEGAL_REVIEW';
  } else if (action === 'RECOMMEND_CA' || action === 'RECOMMEND_LEGAL') {
    if (!can(action === 'RECOMMEND_CA' ? 'crm_workflow_recommend_credit' : 'crm_workflow_recommend_legal'))
      throw mysqlError('Akun ini tidak dapat melakukan sign-off ini', 403);
    currentStatus = 'CREDIT_COMMITTEE_REVIEW';
  } else if (action === 'APPROVE_COMMITTEE' || action === 'REJECT_COMMITTEE') {
    if (!can('crm_workflow_final_decision'))
      throw mysqlError('Akun ini tidak dapat memutuskan sebagai Komite Kredit', 403);
    currentStatus = action === 'APPROVE_COMMITTEE' ? 'APPROVED' : 'REJECTED';
  } else if (action === 'RETURN') {
    if (!can('crm_workflow_return')) throw mysqlError('Akun ini tidak dapat mengembalikan aplikasi', 403);
    currentStatus = 'RETURNED';
  }

  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    const [appRows] = await c.execute<any[]>(
      'SELECT id_pre_analysis FROM all_applications WHERE application_id = ? FOR UPDATE',
      [id],
    );
    if (appRows.length) {
      await c.execute(
        'UPDATE new_application_pre_analisis SET application_status = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id_pre_analysis = ?',
        [currentStatus, appRows[0].id_pre_analysis],
      );
      await c.execute(
        'UPDATE all_applications SET updated_at = CURRENT_TIMESTAMP(3) WHERE application_id = ?',
        [id],
      );
    }
    await c.commit();
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
  }

  return await intakeDetail(id);
}
