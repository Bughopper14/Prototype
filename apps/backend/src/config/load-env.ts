import {existsSync} from 'node:fs';
import path from 'node:path';

/**
 * Loads apps/backend/.env into process.env (variables already set by the environment win).
 * Only this file is read: the repository-root .env is no longer used.
 */
const file = path.resolve('.env');
if (existsSync(file)) process.loadEnvFile(file);
else console.warn(`[env] ${file} not found; copy apps/backend/.env.example to apps/backend/.env`);
