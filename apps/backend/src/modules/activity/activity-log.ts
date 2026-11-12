import crypto from 'node:crypto';
import {pool} from '../../core/db/pool';
import {parsePortalUserId} from '../../core/db/crm-lookups';
import type {Actor} from '../auth/session';

export type ActivityChangeItem = {
  section?: string;
  subSection?: string;
  field?: string;
  fieldKey?: string;
  label?: string;
  fieldLabel?: string;
  oldValue?: unknown;
  newValue?: unknown;
};

/** Appends an entry to `crm_application_activity_logs` and structured rows to `crm_application_activity_changes`. */
export async function logActivity(
  actor: Actor,
  applicationId: string,
  previousStatus: string | null,
  newStatus: string | null,
  comments: string,
  extra?: {
    stageCode?: string;
    sectionName?: string;
    tabIndex?: number;
    actionType?: string;
    changes?: ActivityChangeItem[];
    changesJson?: ActivityChangeItem[];
  },
) {
  const actorUserId = actor.portalUserId || parsePortalUserId(actor.id);
  const actionType =
    extra?.actionType ||
    (previousStatus && newStatus && previousStatus !== newStatus ? 'WORKFLOW_TRANSITION' : 'UPDATE');
  const logId = crypto.randomUUID();
  await pool.execute(
    `INSERT INTO crm_application_activity_logs
      (id, application_id, stage_code, section_name, tab_index, action_type, title, details,
       previous_status, new_status, actor_user_id, actor_name, actor_role)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      logId,
      applicationId,
      extra?.stageCode ?? null,
      extra?.sectionName ?? null,
      extra?.tabIndex ?? null,
      actionType,
      String(comments || '').slice(0, 250) || null,
      comments || null,
      previousStatus,
      newStatus,
      actorUserId,
      actor.name,
      actor.role,
    ],
  );

  const changeItems = Array.isArray(extra?.changes)
    ? extra.changes
    : Array.isArray(extra?.changesJson)
      ? extra.changesJson
      : [];
  for (let i = 0; i < changeItems.length; i++) {
    const ch = changeItems[i] || {};
    await pool.execute(
      `INSERT INTO crm_application_activity_changes
        (id, activity_log_id, section_name, sub_section, field_key, field_label, old_value, new_value, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        logId,
        ch.section ?? extra?.sectionName ?? null,
        ch.subSection ?? null,
        ch.fieldKey ?? ch.field ?? null,
        ch.fieldLabel ?? ch.label ?? null,
        ch.oldValue !== undefined && ch.oldValue !== null ? String(ch.oldValue) : null,
        ch.newValue !== undefined && ch.newValue !== null ? String(ch.newValue) : null,
        i,
      ],
    );
  }
}
