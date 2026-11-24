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

/** Timestamp format: ddmmyyyyhhmm (e.g. 241120260910) */
export function formatTimestampDdmmyyyyhhmm(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hour = pad(d.getHours());
  const minute = pad(d.getMinutes());
  return `${day}${month}${year}${hour}${minute}`;
}

/**
 * Builds standard document file name: jenisDoc_appNumber_ddmmyyyyhhmm.<ext>
 * e.g. NIB_A-000-26-12345_241120260910.pdf
 */
export function buildDocumentFileName(
  jenisDoc: string,
  appNumber: string,
  originalName: string,
  date = new Date(),
): string {
  const ext = (path.extname(originalName) || '.pdf').toLowerCase();
  const cleanJenis = jenisDoc.toUpperCase().replace(/[^A-Z0-9_]/g, '') || 'DOC';
  const cleanApp = String(appNumber || 'APP').replace(/[^a-zA-Z0-9_-]/g, '') || 'APP';
  const timeStr = formatTimestampDdmmyyyyhhmm(date);
  return `${cleanJenis}_${cleanApp}_${timeStr}${ext}`;
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

  /** Initialises standard document folder structure under documents/<appNumber>/ */
  async initApplicationFolders(appNumber: string) {
    if (!appNumber || appNumber === 'unknown' || appNumber === 'APP') return;
    const cleanApp = String(appNumber).replace(/[^a-zA-Z0-9_-]/g, '') || 'APP';
    const baseDir = path.join(this.documentsDir, cleanApp);
    const standardFolders = ['NIB', 'NPWP', 'KTP', 'DEED', 'FAP', 'FINANCIAL', 'BANK', 'OTHERS'];
    await fs.mkdir(baseDir, {recursive: true});
    for (const sub of standardFolders) {
      await fs.mkdir(path.join(baseDir, sub), {recursive: true}).catch(() => undefined);
    }
  }

  /** A named copy under documents/ (or documents/<appNumber>/<jenisDoc>/) for the OCR worker and local storage. */
  async saveNamedCopy(fileName: string, body: Buffer, appNumber?: string, jenisDoc?: string): Promise<string> {
    if (this.s3) return fileName;
    const cleanApp = appNumber && appNumber !== 'unknown' && appNumber !== 'APP'
      ? String(appNumber).replace(/[^a-zA-Z0-9_-]/g, '')
      : null;
    const cleanDoc = jenisDoc ? String(jenisDoc).toUpperCase().replace(/[^A-Z0-9_]/g, '') : null;

    const targetDir = cleanApp && cleanDoc
      ? path.join(this.documentsDir, cleanApp, cleanDoc)
      : this.documentsDir;

    await fs.mkdir(targetDir, {recursive: true});
    const baseName = path.basename(fileName);
    await fs.writeFile(path.join(targetDir, baseName), body);

    return cleanApp && cleanDoc
      ? `Documents/${cleanApp}/${cleanDoc}/${baseName}`
      : `Documents/${baseName}`;
  }

  /** The named copy of an upload under documents/, also when only the name prefix matches or when nested under appNumber/jenisDoc. */
  async locateNamedCopy(fileName: string) {
    const raw = fileName.replace(/^Documents[\\/]/i, '');
    const direct = path.join(this.documentsDir, raw);
    try {
      if ((await fs.stat(direct)).isFile()) return direct;
    } catch {}

    const base = path.basename(fileName);
    const inRoot = path.join(this.documentsDir, base);
    try {
      if ((await fs.stat(inRoot)).isFile()) return inRoot;
    } catch {}

    const prefix = base.split('_[')[0];
    const findRecursive = async (dir: string, depth = 0): Promise<string | null> => {
      if (depth > 3) return null;
      try {
        const entries = await fs.readdir(dir, {withFileTypes: true});
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isFile()) {
            if (entry.name === base || entry.name.startsWith(prefix)) return fullPath;
          } else if (entry.isDirectory()) {
            const found = await findRecursive(fullPath, depth + 1);
            if (found) return found;
          }
        }
      } catch {}
      return null;
    };

    const found = await findRecursive(this.documentsDir);
    return found || direct;
  }

  /** A file under documents/ from its URL segments, or null when the path leaves that folder. */
  documentPath(segments: string[]) {
    const file = path.resolve(this.documentsDir, ...segments);
    return file.startsWith(this.documentsDir + path.sep) ? file : null;
  }

  /** A unique, sanitised path under documents/<appNumber>/<jenisDoc>/ (or fallback documents/<type>/) for an uploaded/scanned identity document. */
  async identityDocumentTarget(
    docTypeRaw: string,
    appIdRaw: string,
    stakeholderIdRaw: string,
    originalName: string,
    customFileName?: string,
    appNumberRaw?: string,
    jenisDocRaw?: string,
  ) {
    const docType =
      String(docTypeRaw || 'general')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '') || 'general';

    const cleanApp = appNumberRaw && appNumberRaw !== 'unknown' && appNumberRaw !== 'APP'
      ? String(appNumberRaw).replace(/[^a-zA-Z0-9_-]/g, '')
      : null;
    const cleanJenis = jenisDocRaw
      ? String(jenisDocRaw).toUpperCase().replace(/[^A-Z0-9_]/g, '')
      : docType.toUpperCase();

    const targetSubdir = cleanApp
      ? path.join(cleanApp, cleanJenis)
      : docType;

    const typeDir = path.join(this.documentsDir, targetSubdir);
    await fs.mkdir(typeDir, {recursive: true});

    let targetBaseName = '';
    let extension = (path.extname(originalName) || '.jpg').toLowerCase();

    if (customFileName) {
      extension = (path.extname(customFileName) || extension).toLowerCase();
      targetBaseName = path.basename(customFileName, extension);
    } else {
      const appLabel = cleanApp || String(appIdRaw || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '') || 'app';
      const cleanStakeholder = String(stakeholderIdRaw || '').replace(/[^a-zA-Z0-9_-]/g, '');
      targetBaseName = `${docType}_${appLabel}`;
      if (cleanStakeholder && cleanStakeholder !== appLabel && cleanStakeholder !== 'unknown') {
        targetBaseName += `_${cleanStakeholder}`;
      }
      targetBaseName += `_${timestamp()}`;
    }

    let fileName = `${targetBaseName}${extension}`;
    for (let counter = 1; ; counter++) {
      try {
        await (await fs.open(path.join(typeDir, fileName), 'wx')).close();
        break;
      } catch (e: any) {
        if (e?.code !== 'EEXIST') throw e;
        fileName = `${targetBaseName}_${counter}${extension}`;
      }
    }

    const relSubdir = targetSubdir.replace(/\\/g, '/');
    return {
      docType,
      fileName,
      savedFilePath: path.join(typeDir, fileName),
      relativePath: `Documents/${relSubdir}/${fileName}`,
      fileUrl: `/documents/${relSubdir}/${fileName}`,
    };
  }
}

@Global()
@Module({providers: [StorageService], exports: [StorageService]})
export class StorageModule {}
