import {existsSync} from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {Global, Injectable, Module} from '@nestjs/common';

/** Storage root: STORAGE_ROOT (relative to the backend folder, or absolute such as a NAS mount), default ./storage/documents. */
function storageRoot() {
  if (process.env.STORAGE_ROOT) {
    return path.resolve(process.cwd(), process.env.STORAGE_ROOT);
  }
  const candidates = [
    path.resolve(process.cwd(), './storage/documents'),
    path.resolve(process.cwd(), '../../storage/documents'),
    path.resolve(process.cwd(), '../storage/documents'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0];
}

const SAFE_DOC_EXTS = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp']);
const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
};

/** The safe extension of an upload: from its MIME type, else from its name when that is an allowed one, else .pdf. */
export function documentExtension(originalName: string, mimeType?: string): string {
  const rawExt = path.extname(originalName || '').toLowerCase();
  return (mimeType && MIME_TO_EXT[mimeType.toLowerCase()]) || (SAFE_DOC_EXTS.has(rawExt) ? rawExt : '.pdf');
}

/** The part every file name of a document shares: jenisDoc_appNumber (e.g. NIB_A-001-26-00001); the number and extension are added when it is stored. */
export function documentBase(jenisDoc: string, appNumber: string): string {
  const cleanJenis = String(jenisDoc || '').toUpperCase().replace(/[^A-Z0-9_]/g, '') || 'DOC';
  const cleanApp = String(appNumber || 'APP').replace(/[^a-zA-Z0-9_-]/g, '') || 'APP';
  return `${cleanJenis}_${cleanApp}`;
}

/** The folder name of an application under STORAGE_ROOT and STORAGE_TEMP. */
const folderOf = (applicationNumber: string) => String(applicationNumber || 'unassigned').replace(/[^a-zA-Z0-9_-]/g, '') || 'unassigned';

/** Temp folder for the scans OCR read: STORAGE_TEMP, default ./storage/temp. Nothing is deleted from it automatically (housekeeping is manual, once a year). */
function storageTemp() {
  if (process.env.STORAGE_TEMP) {
    return path.resolve(process.cwd(), process.env.STORAGE_TEMP);
  }
  const candidates = [
    path.resolve(process.cwd(), './storage/temp'),
    path.resolve(process.cwd(), '../../storage/temp'),
    path.resolve(process.cwd(), '../storage/temp'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0];
}

/**
 * File storage on local disk or a mounted NAS. Files of an application live under STORAGE_ROOT/<application number>/ as
 * `<JENIS>_<application number>_<NNN>.<ext>` (`NIB_A-001-26-00001_001.pdf`); NNN counts per document type from 001 (the last one + 1) and the
 * storage key of a file is that relative path. The scans OCR reads are written to STORAGE_TEMP/<application number>/ as
 * `<JENIS>_<application number>_<NNN>_T<NN>.<ext>` (NNN the document number the scan would get, T the attempt under it) and are not deleted automatically.
 */
@Injectable()
export class StorageService {
  /** Root of the stored files (STORAGE_ROOT). */
  readonly rootDir = storageRoot();
  readonly tempDir = storageTemp();

  /** A path under the root from a storage key, or null when the key leaves the root. */
  private within(key: string) {
    let cleanKey = String(key || '').replace(/^[\\/]+/, '');
    if (/^documents[\\/]+/i.test(cleanKey)) {
      cleanKey = cleanKey.replace(/^documents[\\/]+/i, '');
    }
    const file = path.resolve(this.rootDir, ...cleanKey.split(/[\/]+/).filter(Boolean));
    return file.startsWith(this.rootDir + path.sep) ? file : null;
  }

  /** Applications being numbered right now: one writer at a time per application, so two uploads never take the same number (also for different document types). */
  private readonly numbering = new Map<string, Promise<unknown>>();

  private serial<T>(key: string, work: () => Promise<T>): Promise<T> {
    const run = (this.numbering.get(key) ?? Promise.resolve()).then(work, work);
    const tail = run.catch(() => undefined);
    this.numbering.set(key, tail);
    void tail.then(() => {
      if (this.numbering.get(key) === tail) this.numbering.delete(key);
    });
    return run;
  }

  /** The numbers already used by one document type in an application folder and its bin/ subfolder (`<base>_001`, `<base>_002` ...). */
  private async usedNumbers(dir: string, base: string) {
    const [active, binned] = await Promise.all([
      fs.readdir(dir).catch(() => [] as string[]),
      fs.readdir(path.join(dir, 'bin')).catch(() => [] as string[]),
    ]);
    // `base` only holds letters, digits, _ and - (documentBase cleans it), so it needs no escaping
    const pattern = new RegExp(`^${base}_(\\d{3,})(?:_\\d+)?\\.[^.]+$`);
    return [...active, ...binned].map(name => pattern.exec(name)).filter((m): m is RegExpExecArray => !!m).map(m => Number(m[1]));
  }

  private static readonly number = (n: number) => String(n).padStart(3, '0');

  /**
   * Stores a file of an application (the document itself): `<JENIS>_<application number>_<NNN>`, NNN counting per document type from 001 (the highest
   * number of that type + 1), or `preferred` (the number its scan was filed under in temp) when nobody took it meanwhile. Returns the storage key and name.
   */
  saveDocument(applicationNumber: string, jenisDoc: string, ext: string, body: Buffer, preferred?: number) {
    const folder = folderOf(applicationNumber);
    return this.serial(folder, async () => {
      const dir = path.join(this.rootDir, folder);
      await fs.mkdir(dir, {recursive: true});
      const base = documentBase(jenisDoc, applicationNumber);
      const used = await this.usedNumbers(dir, base);
      let n = preferred !== undefined && !used.includes(preferred) ? preferred : used.length ? Math.max(...used) + 1 : 1;
      for (;; n++) {
        const fileName = `${base}_${StorageService.number(n)}${ext}`;
        try {
          await fs.writeFile(path.join(dir, fileName), body, {flag: 'wx'});
          return {key: `${folder}/${fileName}`, fileName, number: n};
        } catch (e: any) {
          if (e?.code !== 'EEXIST') throw e;
        }
      }
    });
  }

  /**
   * Writes a scan for OCR to the temp folder of its application and returns its path. It is named after the document number it would get:
   * `<JENIS>_<application number>_<NNN>_T<NN>`, NNN the next free document number of that type (from 001), NN the running number (from 01) of the scans
   * filed under that NNN (a scan that was not kept, e.g. the wrong document, leaves NNN free, so the next scan is NNN_T02). Nothing is deleted from the
   * temp folder automatically.
   */
  saveTemp(applicationNumber: string, jenisDoc: string, ext: string, body: Buffer) {
    const folder = folderOf(applicationNumber);
    return this.serial(folder, async () => {
      const base = documentBase(jenisDoc, applicationNumber);
      const used = await this.usedNumbers(path.join(this.rootDir, folder), base);
      const n = used.length ? Math.max(...used) + 1 : 1;
      const dir = path.join(this.tempDir, folder);
      await fs.mkdir(dir, {recursive: true});
      const prefix = `${base}_${StorageService.number(n)}_T`;
      const taken = (await fs.readdir(dir)).filter(name => name.startsWith(prefix)).map(name => /_T(\d+)\.[^.]+$/.exec(name)).filter((m): m is RegExpExecArray => !!m).map(m => Number(m[1]));
      for (let t = taken.length ? Math.max(...taken) + 1 : 1; ; t++) {
        const fileName = `${prefix}${String(t).padStart(2, '0')}${ext}`;
        try {
          await fs.writeFile(path.join(dir, fileName), body, {flag: 'wx'});
          return {key: `${folder}/${fileName}`, fileName, absolutePath: path.join(dir, fileName), number: n};
        } catch (e: any) {
          if (e?.code !== 'EEXIST') throw e;
        }
      }
    });
  }

  /**
   * Moves a soft-deleted document into `<application number>/bin/<fileName>` under STORAGE_ROOT and returns its new storage key.
   * Safe when the file is already in `bin/` or missing on disk.
   */
  async moveToBin(key: string): Promise<string> {
    const src = this.within(key);
    if (!src) throw new Error('Invalid storage key');
    const parts = String(key).split(/[\\/]+/).filter(Boolean);
    if (parts.length >= 2 && parts[1] === 'bin') return parts.join('/');
    const folder = parts[0] || 'unassigned';
    const fileName = parts[parts.length - 1] || path.basename(src);
    const binDir = path.join(this.rootDir, folder, 'bin');
    await fs.mkdir(binDir, {recursive: true});
    const ext = path.extname(fileName);
    const stem = path.basename(fileName, ext);
    let targetName = fileName;
    let dst = path.join(binDir, targetName);
    if (await fs.stat(dst).then(() => true, () => false)) {
      targetName = `${stem}_${Date.now()}${ext}`;
      dst = path.join(binDir, targetName);
    }
    try {
      await fs.rename(src, dst);
    } catch (e: any) {
      if (e?.code === 'EXDEV') {
        await fs.copyFile(src, dst);
        await fs.unlink(src).catch(() => undefined);
      } else if (e?.code !== 'ENOENT') {
        throw e;
      }
    }
    return `${folder}/bin/${targetName}`;
  }

  /** Puts a moved file back at its earlier storage key (nothing to do when it never moved). */
  async moveBack(fromKey: string, toKey: string) {
    const src = this.within(fromKey);
    const dst = this.within(toKey);
    if (!src || !dst) throw new Error('Invalid storage key');
    if (src === dst) return;
    await fs.rename(src, dst).catch((e: any) => {
      if (e?.code !== 'ENOENT') throw e;
    });
  }

  /** Contents of a stored file. */
  async read(key: string) {
    const file = this.within(key);
    if (!file) throw new Error('Invalid storage key');
    return fs.readFile(file);
  }

  /** The absolute path of a file in the temp folder from its key (`<application number>/<file>`), or null when the key leaves the temp folder. */
  tempAbsolute(key: string) {
    const file = path.resolve(this.tempDir, ...String(key).split(/[\/]+/).filter(Boolean));
    return file.startsWith(this.tempDir + path.sep) ? file : null;
  }

  /** The absolute path of a stored file (for the OCR worker). */
  absolutePath(key: string) {
    const file = this.within(key);
    if (!file) throw new Error('Invalid storage key');
    return file;
  }

  /**
   * A stored file from its URL segments, or null when it must not be served: the path leaves the root, or it goes into a bin/ folder (deleted
   * files, for IT only).
   */
  documentPath(segments: string[]) {
    let cleanSegments = [...segments];
    if (cleanSegments[0]?.toLowerCase() === 'documents') {
      cleanSegments.shift();
    }
    const file = this.within(cleanSegments.join('/'));
    if (!file) return null;
    // Windows also reads "bin.", "bin " and "bin::$INDEX_ALLOCATION" as the folder bin
    const hidden = path.relative(this.rootDir, file).split(path.sep).some(part => part.includes(':') || part.replace(/[. ]+$/, '').toLowerCase() === 'bin');
    if (hidden) return null;
    if (existsSync(file)) return file;

    // Fallback: legacy flat files stored directly in rootDir
    const fileName = path.basename(file);
    const flatFile = path.join(this.rootDir, fileName);
    if (existsSync(flatFile)) return flatFile;

    return file;
  }
}

@Global()
@Module({providers: [StorageService], exports: [StorageService]})
export class StorageModule {}
