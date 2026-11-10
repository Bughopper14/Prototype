import fs from 'node:fs/promises';
import path from 'node:path';
import {DeleteObjectCommand, PutObjectCommand, S3Client} from '@aws-sdk/client-s3';

/** File storage: local disk under STORAGE_DIR, or S3/MinIO when the S3_* variables are set. */

import fsSync from 'node:fs';
const envStorage = process.env.STORAGE_DIR;
const resolvedEnv = envStorage ? path.resolve(envStorage) : null;
export const STORAGE_DIR =
  resolvedEnv && fsSync.existsSync(resolvedEnv)
    ? resolvedEnv
    : fsSync.existsSync(path.resolve(process.cwd(), 'storage'))
      ? path.resolve(process.cwd(), 'storage')
      : fsSync.existsSync(path.resolve(__dirname, '../../../../storage'))
        ? path.resolve(__dirname, '../../../../storage')
        : path.resolve(process.cwd(), 'storage');
export const documentsDir = path.join(STORAGE_DIR, 'documents');
export const filesDir = path.join(STORAGE_DIR, 'files');

export const s3 = process.env.S3_BUCKET
  ? new S3Client({
      region: process.env.S3_REGION || 'ap-southeast-1',
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: !!process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      },
    })
  : null;

export async function putStoredFile(key: string, body: Buffer, contentType: string) {
  if (s3) {
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        ServerSideEncryption: 'AES256',
      }),
    );
    return;
  }
  await fs.mkdir(filesDir, {recursive: true});
  await fs.writeFile(path.join(filesDir, key), body);
}

export async function removeStoredDocument(key: string) {
  if (s3) await s3.send(new DeleteObjectCommand({Bucket: process.env.S3_BUCKET, Key: key}));
  else {
    await fs.rm(path.join(filesDir, key), {force: true});
    const protoFiles = path.resolve(STORAGE_DIR, '../prototype-src/storage/files', key);
    await fs.rm(protoFiles, {force: true}).catch(() => undefined);
  }
}

export async function mirrorFileToPrototypeSrc(savedFilePath: string, buffer: Buffer) {
  try {
    const rel = path.relative(documentsDir, savedFilePath);
    const protoTarget = path.resolve(STORAGE_DIR, '../prototype-src/storage/documents', rel);
    if (fsSync.existsSync(path.resolve(STORAGE_DIR, '../prototype-src/storage'))) {
      await fs.mkdir(path.dirname(protoTarget), {recursive: true});
      await fs.writeFile(protoTarget, buffer);
    }
  } catch {}
}

function timestamp(date = new Date()) {
  const two = (n: number) => String(n).padStart(2, '0');
  const day = `${date.getFullYear()}${two(date.getMonth() + 1)}${two(date.getDate())}`;
  return `${day}_${two(date.getHours())}${two(date.getMinutes())}${two(date.getSeconds())}`;
}

/** Builds a unique, sanitised path under storage/documents/<type>/ for an uploaded identity document. */
export async function generateDocumentStorageInfo(
  docTypeRaw: string,
  appIdRaw: string,
  stakeholderIdRaw: string,
  originalName: string,
) {
  const docType =
    String(docTypeRaw || 'general')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '') || 'general';
  const cleanApp = String(appIdRaw || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '') || 'app';
  const cleanStakeholder = String(stakeholderIdRaw || '').replace(/[^a-zA-Z0-9_-]/g, '');
  const extension = (path.extname(originalName) || '.jpg').toLowerCase();
  const typeDir = path.join(documentsDir, docType);
  await fs.mkdir(typeDir, {recursive: true});

  let baseName = `${docType}_${cleanApp}`;
  if (cleanStakeholder && cleanStakeholder !== cleanApp && cleanStakeholder !== 'unknown') {
    baseName += `_${cleanStakeholder}`;
  }
  baseName += `_${timestamp()}`;

  let fileName = `${baseName}${extension}`;
  for (let counter = 1; ; counter++) {
    try {
      await fs.access(path.join(typeDir, fileName));
      fileName = `${baseName}_${counter}${extension}`;
    } catch {
      break;
    }
  }

  return {
    docType,
    fileName,
    typeDir,
    savedFilePath: path.join(typeDir, fileName),
    relativePath: `Documents/${docType}/${fileName}`,
    fileUrl: `/documents/${docType}/${fileName}`,
  };
}
