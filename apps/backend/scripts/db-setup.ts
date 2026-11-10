/**
 * One-time (and re-runnable) database setup:
 *   1. creates the database if it does not exist,
 *   2. applies db/schema.sql (all DDL, idempotent),
 *   3. loads db/seed.sql (reference data: portal apps, roles, authorities, mandatory-field rules),
 *   4. runs the migrations / master-data seeding and creates the audit triggers.
 *
 * Usage: pnpm db:setup
 */
import {pool} from '../src/core/db/pool';
import {runSetup} from '../src/core/db/setup';
import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';

async function main() {
  const database = process.env.DB_NAME;
  if (!database) throw new Error('DB_NAME is not set. Copy .env.example to .env first.');

  const admin = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });
  try {
    await admin.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4`);
    await admin.query(`USE \`${database}\``);
    for (const file of ['schema.sql', 'seed.sql']) {
      await admin.query(await fs.readFile(path.resolve('db', file), 'utf8'));
      console.log(`applied db/${file}`);
    }
  } finally {
    await admin.end();
  }

  await runSetup();
  console.log('migrations and reference data are up to date');
  await pool.end();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
