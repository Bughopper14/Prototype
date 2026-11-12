import fs from 'node:fs/promises';
import path from 'node:path';
import {documentsDir} from '../../core/storage';
import {
  getSubmitLock,
  readApplicationDocuments,
  saveFapComparison,
  saveFapRemarks,
  syncSubmitLock,
} from '../documents/documents.repository';
import {computeFapDiffs} from './fap-diff';
import {runOcr} from '../ocr/ocr-runner';

export const isFapChecklist = (d: any) =>
  String(d.documentCode).toUpperCase() === 'FAP' || String(d.documentName).toLowerCase().includes('fap');

export async function locateDocument(fileName: string) {
  const base = path.basename(fileName);
  const exact = path.join(documentsDir, base);
  try {
    if ((await fs.stat(exact)).isFile()) return exact;
  } catch {
    /* fall through to prefix match */
  }
  const prefix = base.split('_[')[0];
  try {
    const match = (await fs.readdir(documentsDir)).find(f => f.startsWith(prefix));
    if (match) return path.join(documentsDir, match);
  } catch {
    /* documents dir does not exist yet */
  }
  return exact;
}

export const inFlight = new Map<string, Promise<any>>();

/** Runs the FAP OCR once per application at a time and stores the diff against the saved application data. */
export async function compareFapDocumentOcr(id: string, fileName: string, currentApp: any) {
  const running = inFlight.get(id);
  if (running) return running;
  const task = (async () => {
    try {
      const ocr = await runOcr(await locateDocument(fileName), 'fap', 120000);
      const extracted = ocr.data || {};
      const diffs = computeFapDiffs(currentApp, extracted);
      const comparison = {
        isFap: true,
        hasDifferences: diffs.length > 0,
        diffs,
        extractedData: extracted,
        fileName,
        comparedAt: new Date().toISOString(),
      };
      await saveFapComparison(id, comparison);
      return comparison;
    } catch (err) {
      console.warn('compareFapDocumentOcr error:', err);
      return null;
    }
  })();
  inFlight.set(id, task);
  try {
    return await task;
  } finally {
    inFlight.delete(id);
  }
}

export const latestFapFile = async (id: string) => {
  const fap = (await readApplicationDocuments(id)).find(isFapChecklist);
  return {fap, file: fap?.files?.[fap.files.length - 1]};
};

/** Clears the stored differences. Approving a FAP document never rewrites system data; differences live in the remarks. */
export async function clearFapDifferences(id: string, remarks: unknown) {
  if (remarks !== undefined) await saveFapRemarks(id, String(remarks || ''));
  const lock = await getSubmitLock(id);
  await saveFapComparison(id, {...(lock.ocrComparison || {}), isFap: true, status: 'APPROVED', hasDifferences: false, diffs: []});
  await syncSubmitLock(id);
}
