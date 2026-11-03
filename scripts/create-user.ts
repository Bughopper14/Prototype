/**
 * Creates a portal user (the same `users` table the login page checks).
 *
 * Usage: npm run user:create -- <username> <password> "<Full Name>" [--admin]
 * --admin grants the Super Admin role on every portal application.
 */
import {hashPassword} from '@/lib/server/auth/password';

async function main() {
  const [username, password, fullName] = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
  const admin = process.argv.includes('--admin');
  if (!username || !password || !fullName) {
    throw new Error('Usage: npm run user:create -- <username> <password> "<Full Name>" [--admin]');
  }
  const {pool} = await import('@/lib/server/db/pool');
  const [result] = await pool.execute<any>(
    'INSERT INTO users (username, password_hash, full_name, is_active) VALUES (?, ?, ?, 1)',
    [username, hashPassword(password), fullName]);
  const userId = result.insertId;
  if (admin) {
    await pool.execute(
      `INSERT IGNORE INTO user_app_roles (user_id, app_id, role_id)
       SELECT ?, r.app_id, r.id FROM roles r WHERE r.role_name = 'Super Admin'`, [userId]);
  }
  console.log(`created user #${userId} (${username})${admin ? ' as Super Admin' : ''}`);
  await pool.end();
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
