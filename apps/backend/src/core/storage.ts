import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import {GetObjectCommand, PutObjectCommand, S3Client} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import {Global, Injectable, Module} from '@nestjs/common';

/** Storage root: STORAGE_DIR when it exists, otherwise the `storage` folder of the backend. */
function storageRoot() {
  const fromEnv = process.env.STORAGE_DIR ? path.resolve(process.env.STORAGE_DIR) : null;
  if (fromEnv && fsSync.existsSync(fromEnv)) return fromEnv;
  const inCwd = path.resolve(process.cwd(), 'storage');
  if (fsSync.existsSync(inCwd)) return inCwd;
  const inRepo = path.resolve(__dirname, '../../../../storage');
  return fsSync.existsSync(inRepo) ? inRepo : inCwd;
}

function timestamp(date = new Date()) {
  const two = (n: number) => String(n).padStart(2, '0');
  const day = `${date.getFullYear()}${two(date.getMonth() + 1)}${two(date.getDate())}`;
  return `${day}_${two(date.getHours())}${two(date.getMinutes())}${two(date.getSeconds())}`;
}

/**
 * File storage: uploaded checklist files under files/ (or S3/MinIO when the S3_* variables are set), and named copies
 * under documents/ that the OCR worker reads (FAP documents, identity documents).
 */
@Injectable()
export class StorageService {
  readonly documentsDir: string;
  readonly filesDir: string;
  private readonly bucket = process.env.S3_BUCKET || null;
  private readonly s3 = this.bucket
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

  constructor() {
    const root = storageRoot();
    this.documentsDir = path.join(root, 'documents');
    this.filesDir = path.join(root, 'files');
  }

  get usesS3() {
    return !!this.s3;
  }

  /** Stores an uploaded checklist file under its storage key. */
  async put(key: string, body: Buffer, contentType: string) {
    if (this.s3) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket!,
          Key: key,
          Body: body,
          ContentType: contentType,
          ServerSideEncryption: 'AES256',
        }),
      );
      return;
    }
    await fs.mkdir(this.filesDir, {recursive: true});
    await fs.writeFile(path.join(this.filesDir, key), body);
  }

  /** Contents of a locally stored checklist file. */
  read(key: string) {
    return fs.readFile(path.join(this.filesDir, path.basename(key)));
  }

  /** A pre-signed S3 link (15 minutes), inline or as a download. Only when S3 is configured. */
  signedUrl(key: string, fileName: string, download: boolean) {
    const disposition = `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(fileName)}`;
    return getSignedUrl(
      this.s3!,
      new GetObjectCommand({Bucket: this.bucket!, Key: key, ResponseContentDisposition: disposition}),
      {expiresIn: 900},
    );
  }

  /** A named copy under documents/ for the OCR worker (local storage only). */
  async saveNamedCopy(fileName: string, body: Buffer) {
    if (this.s3) return;
    await fs.mkdir(this.documentsDir, {recursive: true});
    await fs.writeFile(path.join(this.documentsDir, path.basename(fileName)), body);
  }

  /** The named copy of an upload under documents/, also when only the name prefix matches. */
  async locateNamedCopy(fileName: string) {
    const base = path.basename(fileName);
    const exact = path.join(this.documentsDir, base);
    try {
      if ((await fs.stat(exact)).isFile()) return exact;
    } catch {}
    const prefix = base.split('_[')[0];
    try {
      const match = (await fs.readdir(this.documentsDir)).find(f => f.startsWith(prefix));
      if (match) return path.join(this.documentsDir, match);
    } catch {}
    return exact;
  }

  /** A file under documents/ from its URL segments, or null when the path leaves that folder. */
  documentPath(segments: string[]) {
    const file = path.resolve(this.documentsDir, ...segments);
    return file.startsWith(this.documentsDir + path.sep) ? file : null;
  }

  /** A unique, sanitised path under documents/<type>/ for an uploaded identity document. */
  async identityDocumentTarget(docTypeRaw: string, appIdRaw: string, stakeholderIdRaw: string, originalName: string) {
    const docType =
      String(docTypeRaw || 'general')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '') || 'general';
    const cleanApp = String(appIdRaw || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '') || 'app';
    const cleanStakeholder = String(stakeholderIdRaw || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const extension = (path.extname(originalName) || '.jpg').toLowerCase();
    const typeDir = path.join(this.documentsDir, docType);
    await fs.mkdir(typeDir, {recursive: true});

    let baseName = `${docType}_${cleanApp}`;
    if (cleanStakeholder && cleanStakeholder !== cleanApp && cleanStakeholder !== 'unknown') {
      baseName += `_${cleanStakeholder}`;
    }
    baseName += `_${timestamp()}`;

    // The name is RESERVED by creating the file exclusively ('wx'), so two scans that arrive at the same moment can never pick the same name
    // (checking first and writing later let simultaneous uploads overwrite each other). The caller writes the content over its own reserved file.
    let fileName = `${baseName}${extension}`;
    for (let counter = 1; ; counter++) {
      try {
        await (await fs.open(path.join(typeDir, fileName), 'wx')).close();
        break;
      } catch (e: any) {
        if (e?.code !== 'EEXIST') throw e;
        fileName = `${baseName}_${counter}${extension}`;
      }
    }

    return {
      docType,
      fileName,
      savedFilePath: path.join(typeDir, fileName),
      relativePath: `Documents/${docType}/${fileName}`,
      fileUrl: `/documents/${docType}/${fileName}`,
    };
  }
}

@Global()
@Module({providers: [StorageService], exports: [StorageService]})
export class StorageModule {}
