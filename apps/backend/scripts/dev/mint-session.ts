/**
 * Dev/test helper: opens a real session for an existing portal user and prints the cookie,
 * so the API can be exercised with curl without knowing the password.
 *
 * Usage: tsx --import ./src/config/load-env.ts scripts/dev/mint-session.ts <username>
 */
import {pool} from '../../src/core/db/pool';
import {createSessionRecord, isAdminUser, signSession, SESSION_COOKIE} from '../../src/modules/auth/session';

async function main() {
  const username = process.argv[2];
  if (!username) throw new Error('Usage: mint-session.ts <username>');
  const [rows] = await pool.query<any[]>('SELECT id, username FROM users_users WHERE username = ? AND is_active = 1', [
    username,
  ]);
  if (!rows[0]) throw new Error(`No active user "${username}"`);
  const {sid} = await createSessionRecord(rows[0].id, '127.0.0.1', 'dev-mint', 'CRM Dashboard');
  console.log(`${SESSION_COOKIE}=${signSession(rows[0].id, sid)}`);
  await pool.end();
}

main().catch(e => {
  console.error(e.message || e);
  process.exit(1);
});
