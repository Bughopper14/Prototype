import {existsSync} from 'node:fs';
import path from 'node:path';

/**
 * Loads apps/backend/.env into process.env (variables already set by the environment win).
 * Checks multiple candidates for compatibility across monorepo and legacy running directories.
 */
const candidates = [
  path.resolve('.env'),
  path.resolve('apps/backend/.env'),
  path.resolve('prototype-src/.env'),
  path.resolve('prototype-src/apps/backend/.env'),
  path.resolve('../../.env'),
];
const file = candidates.find(existsSync);
if (file) {
  process.loadEnvFile(file);
  if (file === candidates[1]) console.warn(`[env] Using ${file}; move it to apps/backend/.env`);
} else {
  console.warn(`[env] .env not found in candidates; copy apps/backend/.env.example to apps/backend/.env`);
}
