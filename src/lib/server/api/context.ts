import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {S3Client, PutObjectCommand, DeleteObjectCommand} from '@aws-sdk/client-s3';
import type {PoolConnection} from 'mysql2/promise';
import {pool} from '../db/pool';
import {defaultMasterCatalog, type MasterCatalog} from '@/lib/shared/master-catalog';
import {locationCatalog} from '@/lib/server/db/repositories/location';
import {customerMasterCatalog} from '@/lib/server/db/repositories/customer-masters';
import {businessMasterCatalog} from '@/lib/server/db/repositories/business-masters';
import {legalMasterCatalog} from '@/lib/server/db/repositories/legal-masters';
import {financeMasterCatalog} from '@/lib/server/db/repositories/finance-masters';
import {equipmentMasterCatalog} from '@/lib/server/db/repositories/equipment-masters';
import {documentMasterCatalog} from '@/lib/server/db/repositories/document-masters';

const execFileAsync = promisify(execFile);

/* ---------- file storage ---------- */

export const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || 'storage');
export const documentsDir = path.join(STORAGE_DIR, 'documents');
export const filesDir = path.join(STORAGE_DIR, 'files');

export const s3 = process.env.S3_BUCKET
  ? new S3Client({
      region: process.env.S3_REGION || 'ap-southeast-1',
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: !!process.env.S3_ENDPOINT,
      credentials: {accessKeyId: process.env.S3_ACCESS_KEY_ID || '', secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || ''},
    })
  : null;

export async function putStoredFile(key: string, body: Buffer, contentType: string) {
  if (s3) {
    await s3.send(new PutObjectCommand({Bucket: process.env.S3_BUCKET, Key: key, Body: body, ContentType: contentType, ServerSideEncryption: 'AES256'}));
    return;
  }
  await fs.mkdir(filesDir, {recursive: true});
  await fs.writeFile(path.join(filesDir, key), body);
}

export async function removeStoredDocument(key: string) {
  if (s3) await s3.send(new DeleteObjectCommand({Bucket: process.env.S3_BUCKET, Key: key}));
  else await fs.rm(path.join(filesDir, key), {force: true});
}

const stamp = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

/** Builds a unique, sanitised path under storage/documents/<type>/ for an uploaded identity document. */
export async function generateDocumentStorageInfo(docTypeRaw: string, appIdRaw: string, stakeholderIdRaw: string, originalName: string) {
  const docType = String(docTypeRaw || 'general').toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'general';
  const cleanApp = String(appIdRaw || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '') || 'app';
  const cleanStk = String(stakeholderIdRaw || '').replace(/[^a-zA-Z0-9_-]/g, '');
  const ext = (path.extname(originalName) || '.jpg').toLowerCase();
  const typeDir = path.join(documentsDir, docType);
  await fs.mkdir(typeDir, {recursive: true});

  let baseName = `${docType}_${cleanApp}`;
  if (cleanStk && cleanStk !== cleanApp && cleanStk !== 'unknown') baseName += `_${cleanStk}`;
  baseName += `_${stamp()}`;

  let fileName = `${baseName}${ext}`;
  for (let counter = 1; ; counter++) {
    try { await fs.access(path.join(typeDir, fileName)); fileName = `${baseName}_${counter}${ext}`; }
    catch { break; }
  }
  return {
    docType, fileName, typeDir,
    savedFilePath: path.join(typeDir, fileName),
    relativePath: `Documents/${docType}/${fileName}`,
    fileUrl: `/documents/${docType}/${fileName}`,
  };
}

/* ---------- OCR service (Python, services/ocr) ---------- */

const OCR_DIR = path.resolve('services/ocr');
const OCR_SCRIPT = path.join(OCR_DIR, 'ocr_cli.py');

/** PYTHON_PATH wins; otherwise the service's own virtual environment (services/ocr/.venv); otherwise "python" on PATH. */
function pythonExecutable() {
  if (process.env.PYTHON_PATH?.trim()) return process.env.PYTHON_PATH.trim();
  const venv = process.platform === 'win32'
    ? path.join(OCR_DIR, '.venv', 'Scripts', 'python.exe')
    : path.join(OCR_DIR, '.venv', 'bin', 'python');
  return existsSync(venv) ? venv : 'python';
}

export async function runOcr(filePath: string, docType: string, timeout = 45000) {
  const {stdout} = await execFileAsync(pythonExecutable(), [OCR_SCRIPT, filePath, docType], {
    timeout, env: {...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1', TESSDATA_PREFIX: process.env.TESSDATA_PREFIX || path.join(OCR_DIR, 'tessdata')},
  });
  const start = stdout.indexOf('{');
  const end = stdout.lastIndexOf('}');
  const result = start !== -1 && end !== -1 ? JSON.parse(stdout.slice(start, end + 1)) : JSON.parse(stdout.trim());
  if (result.error) throw new Error(result.error);
  return result;
}

/* ---------- master data catalog ---------- */

let cachedMasterData: {catalog: any; revision: number} | null = null;
let cachedMasterDataGzip: Buffer | null = null;

export const invalidateMasterData = () => { cachedMasterData = null; cachedMasterDataGzip = null; };
export const masterDataGzip = (data: unknown) => (cachedMasterDataGzip ??= zlib.gzipSync(Buffer.from(JSON.stringify(data), 'utf-8')));

type Queryable = Pick<PoolConnection, 'query'>;

export async function masterData(conn?: Queryable, forceRefresh = false) {
  if (cachedMasterData && !forceRefresh && !conn) return cachedMasterData;
  const [rows] = await (conn || pool).query<any[]>('SELECT catalog,revision FROM master_data WHERE id=1');
  const stored = rows[0]?.catalog ? (typeof rows[0].catalog === 'string' ? JSON.parse(rows[0].catalog) : rows[0].catalog) : {};
  const def = defaultMasterCatalog();
  const merged: any = {...def, ...stored};
  for (const k of ['district', 'village', 'postalCode'] as const) {
    merged[k] = merged[k] || [];
    const seen = new Set(merged[k].map((x: any) => x.value));
    for (const item of (def as any)[k] || []) {
      if (!seen.has(item.value)) { merged[k].push(item); seen.add(item.value); }
    }
  }
  const catalog = await locationCatalog(merged as MasterCatalog);
  const result = {
    catalog: await documentMasterCatalog(await equipmentMasterCatalog(await financeMasterCatalog(await legalMasterCatalog(await businessMasterCatalog(await customerMasterCatalog(catalog)))))),
    revision: rows[0]?.revision || 0,
  };
  if (!conn) cachedMasterData = result;
  return result;
}

/* ---------- activity log ---------- */

import crypto from 'node:crypto';
import type {Actor} from '../auth/session';

export const logActivity = (actor: Actor, applicationId: string, previousStatus: string | null, newStatus: string | null, comments: string) =>
  pool.execute(
    'INSERT INTO application_activity(id,application_id,action_by,user_role,previous_status,new_status,comments) VALUES(?,?,?,?,?,?,?)',
    [crypto.randomUUID(), applicationId, actor.name, actor.role, previousStatus, newStatus, comments]);
