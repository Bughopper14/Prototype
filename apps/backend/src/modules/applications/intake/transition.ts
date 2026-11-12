/** Workflow stage transitions backed by crm_master_workflow, stage progress, transitions, and signoffs. */
import {randomUUID} from 'node:crypto';
import {cleanNullableString} from '../../../core/db/crm-lookups';
import {pool} from '../../../core/db/pool';
import {Problem} from '../../../core/domain';
import {requireAuthority} from '../../auth/session';
import {intakeDetail} from './detail';
import {actorMeta} from './helpers';

const ACTION_ALIAS: Record<string, string> = {
  SUBMIT_TO_BS: 'SUBMIT',
};

export async function transitionIntake(
  id: string,
  body: {action?: string; comments?: string; rejectReasonId?: string},
  actor: any,
) {
  const rawAction = String(body?.action || '').trim().toUpperCase();
  if (!rawAction) throw new Problem(422, 'Workflow action is required.');
  const workflowAction = ACTION_ALIAS[rawAction] || rawAction;
  const {userId, actorName, actorRole} = actorMeta(actor);
  const comments = cleanNullableString(body?.comments);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [appRows] = await conn.query<any[]>(
      'SELECT * FROM crm_applications WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [id],
    );
    const app = appRows[0];
    if (!app) throw new Problem(404, 'Application not found.');

    const [wfRows] = await conn.query<any[]>(
      `SELECT w.*, a.authority_name,
              ts.id AS after_status_id, ts.code AS after_status_code, ts.stage_id AS after_stage_id, ts.is_terminal
       FROM crm_master_workflow w
       JOIN users_authorities a ON a.id = w.authority_id
       JOIN crm_master_workflow_statuses ts ON ts.id = w.after_status_id
       WHERE w.before_status_id = ? AND w.action = ?
       LIMIT 1`,
      [app.current_status_id, workflowAction],
    );
    const wf = wfRows[0];
    if (!wf) {
      throw new Problem(422, `Action "${rawAction}" is not valid for the current application status.`);
    }

    requireAuthority(actor, wf.authority_name);

    const isReturningToMaker = wf.after_status_code === 'RETURNED' || wf.after_status_code === 'DRAFT';
    await conn.execute(
      `UPDATE crm_applications
       SET current_status_id = ?, is_fap_form_locked = ?, updated_at = CURRENT_TIMESTAMP(3), updated_by = ?
       WHERE id = ?`,
      [wf.after_status_id, isReturningToMaker ? 0 : 1, actorName, id],
    );

    const submittedAtExpr = workflowAction === 'SUBMIT' ? 'CURRENT_TIMESTAMP(3)' : 'NULL';
    const completedAtExpr = wf.is_terminal ? 'CURRENT_TIMESTAMP(3)' : 'NULL';
    await conn.execute(
      `INSERT INTO crm_application_stage_progress (
        id, application_id, stage_id, status_id, is_locked, started_at, submitted_at, completed_at,
        assigned_user_id, assigned_user_name, created_by, updated_by
      ) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP(3),${submittedAtExpr},${completedAtExpr},?,?,?,?)
      ON DUPLICATE KEY UPDATE
        status_id = VALUES(status_id),
        is_locked = VALUES(is_locked),
        submitted_at = COALESCE(VALUES(submitted_at), submitted_at),
        completed_at = COALESCE(VALUES(completed_at), completed_at),
        assigned_user_id = VALUES(assigned_user_id),
        assigned_user_name = VALUES(assigned_user_name),
        updated_at = CURRENT_TIMESTAMP(3),
        updated_by = VALUES(updated_by)`,
      [
        randomUUID(),
        id,
        wf.after_stage_id,
        wf.after_status_id,
        wf.is_terminal ? 1 : 0,
        userId,
        actorName,
        actorName,
        actorName,
      ],
    );

    await conn.execute(
      `INSERT INTO crm_application_stage_transitions (
        id, application_id, workflow_id, from_status_id, to_status_id, action_code,
        reject_reason_id, comments, actor_user_id, actor_name, actor_role
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        randomUUID(),
        id,
        wf.id,
        app.current_status_id,
        wf.after_status_id,
        rawAction,
        cleanNullableString(body?.rejectReasonId),
        comments,
        userId,
        actorName,
        actorRole,
      ],
    );

    const signoffDecision =
      workflowAction === 'APPROVE_COMMITTEE'
        ? 'APPROVED'
        : workflowAction === 'REJECT_COMMITTEE'
          ? 'REJECTED'
          : 'SIGNED';

    await conn.execute(
      `INSERT INTO crm_application_signoffs (
        id, application_id, stage_id, role_code, actor_user_id, actor_name, decision, remarks
      ) VALUES (?,?,?,?,?,?,?,?)`,
      [randomUUID(), id, wf.after_stage_id, actorRole, userId, actorName, signoffDecision, comments],
    );

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  return intakeDetail(id);
}
