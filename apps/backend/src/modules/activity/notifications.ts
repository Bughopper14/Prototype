import crypto from 'node:crypto';
import {pool} from '../../core/db/pool';

export const newNotification = (
  recipient: string,
  applicationId: string,
  deedId: string,
  title: string,
  message: string,
) =>
  pool.execute(
    'INSERT INTO notifications(id,recipient_user_id,application_id,deed_id,title,message) VALUES(?,?,?,?,?,?)',
    [crypto.randomUUID(), recipient, applicationId, deedId, title, message],
  );
