import crypto from 'node:crypto';

/**
 * Passwords in the portal `users` table were written by Werkzeug:
 *   scrypt:<N>:<r>:<p>$<salt>$<hex>   or   pbkdf2:<hash>:<iterations>$<salt>$<hex>
 * Verification supports both formats; new hashes use scrypt with the same defaults.
 */
export function verifyPassword(password: string, stored: string): boolean {
  const [method, salt, hash] = String(stored || '').split('$');
  if (!method || !salt || !hash) return false;
  const [kind, ...params] = method.split(':');
  let derived: Buffer;
  try {
    if (kind === 'scrypt') {
      const [n, r, p] = params.map(Number);
      derived = crypto.scryptSync(password, salt, hash.length / 2, {N: n, r, p, maxmem: 132 * n * r * p});
    } else if (kind === 'pbkdf2') {
      const algo = params[0] || 'sha256';
      const iterations = Number(params[1] || 600000);
      derived = crypto.pbkdf2Sync(password, salt, iterations, hash.length / 2, algo);
    } else {
      return false;
    }
  } catch {
    return false;
  }
  const expected = Buffer.from(hash, 'hex');
  return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
}

export function hashPassword(password: string): string {
  const n = 32768;
  const r = 8;
  const p = 1;
  const salt = crypto.randomBytes(12).toString('base64url').slice(0, 16);
  const derived = crypto.scryptSync(password, salt, 64, {N: n, r, p, maxmem: 132 * n * r * p});
  return `scrypt:${n}:${r}:${p}$${salt}$${derived.toString('hex')}`;
}
