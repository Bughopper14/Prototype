import crypto from 'node:crypto';
import {pool} from '../../core/db/pool';
import type {Actor} from '../auth/session';

/** Appends an entry to the application activity feed. */
export function logActivity(
  actor: Actor,
  applicationId: string,
  previousStatus: string | null,
  newStatus: string | null,
  comments: string,
) {
  return pool.execute(
    `INSERT INTO application_activity (id, application_id, action_by, user_role, previous_status, new_status, comments)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), applicationId, actor.name, actor.role, previousStatus, newStatus, comments],
  );
}
