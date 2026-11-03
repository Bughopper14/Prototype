/** Dev check: Werkzeug-compatible hashing round-trips, and a stored portal hash is parsed without error. */
import {hashPassword, verifyPassword} from '@/lib/server/auth/password';

async function main() {
  const hash = hashPassword('s3cret-test');
  console.log('roundtrip ok:', verifyPassword('s3cret-test', hash), '| wrong rejected:', !verifyPassword('nope', hash));
  const {pool} = await import('@/lib/server/db/pool');
  const [rows] = await pool.query<any[]>('SELECT username, password_hash FROM users');
  for (const u of rows) console.log(`${u.username}: format=${String(u.password_hash).split('$')[0]} parsed-without-error=${verifyPassword('definitely-wrong', u.password_hash) === false}`);
  await pool.end();
}
main();
