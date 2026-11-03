/**
 * Dev/test helper: opens a real session for an existing portal user and prints the cookie,
 * so the API can be exercised with curl without knowing the password.
 *
 * Usage: tsx --env-file=.env scripts/dev/mint-session.ts <username>
 */
import {createSessionRecord, isAdminUser, signSession, SESSION_COOKIE} from '@/lib/server/auth/session';

async function main() {
  const username = process.argv[2];
  if (!username) throw new Error('Usage: mint-session.ts <username>');
  const {pool} = await import('@/lib/server/db/pool');
  const [rows] = await pool.query<any[]>('SELECT id FROM users WHERE username = ? AND is_active = 1', [username]);
  if (!rows[0]) throw new Error(`No active user "${username}"`);
  const sid = await createSessionRecord(rows[0].id, await isAdminUser(rows[0].id, username), '127.0.0.1', 'dev-mint');
  console.log(`${SESSION_COOKIE}=${signSession(rows[0].id, sid)}`);
  await pool.end();
}

main().catch(e => { console.error(e.message || e); process.exit(1); });
