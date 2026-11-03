import {pool} from '@/lib/server/db/pool';
import {currentActor, clientIp} from '@/lib/server/auth/guard';
import {hashPassword, verifyPassword} from '@/lib/server/auth/password';
import {logAudit} from '@/lib/server/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json'}});

export async function POST(request: Request) {
  const actor = await currentActor(request);
  if (!actor) return json({success: false, error: 'Sesi tidak valid. Silakan login kembali.'}, 401);
  const {current_password = '', new_password = ''} = await request.json().catch(() => ({}));
  if (!current_password || !new_password) return json({success: false, error: 'Semua field wajib diisi.'});
  if (String(new_password).length < 6)
    return json({success: false, error: 'Password baru minimal 6 karakter.'});

  const [rows] = await pool.query<any[]>('SELECT password_hash FROM users WHERE id = ? AND is_active = 1', [
    actor.portalUserId,
  ]);
  if (!rows[0]) return json({success: false, error: 'User tidak ditemukan.'});
  if (!verifyPassword(current_password, rows[0].password_hash))
    return json({success: false, error: 'Password saat ini salah.'});

  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [
    hashPassword(new_password),
    actor.portalUserId,
  ]);
  await logAudit(actor.portalUserId, 'Changed Password', 'Portal Hub', clientIp(request));
  return json({success: true});
}
