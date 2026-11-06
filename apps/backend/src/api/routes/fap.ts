import fs from 'node:fs/promises';
import path from 'node:path';
import {Problem} from '../../domain';
import {requireRole} from '../../auth/session';
import {exec} from '../../db/query';
import {intakeDetail} from '../../db/repositories/intake';
import {
  getSubmitLock,
  readApplicationDocuments,
  saveFapComparison,
  saveFapRemarks,
  syncSubmitLock,
} from '../../db/repositories/documents';
import {
  getFapSubmissionArchiveDetail,
  getFapSubmissionArchives,
  recordFapSubmissionArchive,
} from '../../db/repositories/fap-archive';
import {computeFapDiffs} from '../../domain/fap-diff';
import {del, get, patch, post, put} from '../router';
import {documentsDir} from '../../storage';
import {runOcr} from '../../ocr/runner';

const REVIEW_ROLES = ['MKT', 'BS', 'CA', 'LEGAL', 'COMMITTEE'];

export const isFapChecklist = (d: any) =>
  String(d.documentCode).toUpperCase() === 'FAP' || String(d.documentName).toLowerCase().includes('fap');

async function locateDocument(fileName: string) {
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

const inFlight = new Map<string, Promise<any>>();

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

const latestFapFile = async (id: string) => {
  const fap = (await readApplicationDocuments(id)).find(isFapChecklist);
  return {fap, file: fap?.files?.[fap.files.length - 1]};
};

get('/applications/:id/fap-comparison', async req => {
  const id = req.params.id;
  const {fap, file} = await latestFapFile(id);
  if (!fap || !file) return {status: 'success', comparison: null};

  const lock = await getSubmitLock(id);
  const currentApp = await intakeDetail(id);
  let comp = lock.ocrComparison;
  if (!comp || !comp.extractedData || Object.keys(comp.extractedData).length === 0) {
    if (currentApp) comp = await compareFapDocumentOcr(id, file.fileName, currentApp);
  } else if (currentApp) {
    comp.diffs = computeFapDiffs(currentApp, comp.extractedData);
    comp.hasDifferences = comp.diffs.length > 0;
    await saveFapComparison(id, comp);
  }
  comp = comp || {isFap: true, hasDifferences: false, diffs: []};
  comp.remarks = lock.remarks || comp.remarks || fap.notes || '';
  return {status: 'success', comparison: comp};
});

post('/applications/:id/fap-comparison/remarks', async req => {
  requireRole(req.actor, REVIEW_ROLES);
  const remarks = String(req.body.remarks || '');
  await saveFapRemarks(req.params.id, remarks);
  return {success: true, remarks, comparison: (await getSubmitLock(req.params.id)).ocrComparison};
});

post('/applications/:id/fap-comparison/run', async (req, res) => {
  requireRole(req.actor, REVIEW_ROLES);
  const id = req.params.id;
  const currentApp = await intakeDetail(id);
  if (!currentApp) {
    res.status(404);
    return {error: 'Application not found'};
  }
  const {file} = await latestFapFile(id);
  if (!file) {
    res.status(400);
    return {error: 'Belum ada dokumen FAP yang diunggah'};
  }
  return {success: true, comparison: await compareFapDocumentOcr(id, file.fileName, currentApp)};
});

/** Clears the stored differences. Approving a FAP document never rewrites system data; differences live in the remarks. */
async function clearFapDifferences(id: string, remarks: unknown) {
  if (remarks !== undefined) await saveFapRemarks(id, String(remarks || ''));
  const lock = await getSubmitLock(id);
  await saveFapComparison(id, {...(lock.ocrComparison || {}), isFap: true, hasDifferences: false, diffs: []});
  await syncSubmitLock(id);
}

post('/applications/:id/fap-changes/approve', async (req, res) => {
  requireRole(req.actor, REVIEW_ROLES);
  const id = req.params.id;
  const current = await intakeDetail(id);
  if (!current) {
    res.status(404);
    return {error: 'Application not found'};
  }
  await clearFapDifferences(id, req.body?.remarks);
  await exec(
    "UPDATE application_submit_lock SET stage='PRE_ANALYSIS', is_locked=0, updated_at=CURRENT_TIMESTAMP(3) WHERE application_id=?",
    [id],
  );
  try {
    await recordFapSubmissionArchive(id, current, req.actor, req.body?.remarks);
  } catch (e) {
    console.error('recordFapSubmissionArchive error on fap approve:', e);
  }
  return {success: true, application: await intakeDetail(id), customerDetailLocked: false};
});

post('/applications/:id/fap-changes/dismiss', async req => {
  await clearFapDifferences(req.params.id, req.body?.remarks);
  return {success: true};
});

/* ---------- immutable submission archive ---------- */

get('/applications/:id/fap-archive', async req => ({
  success: true,
  archives: await getFapSubmissionArchives(req.params.id),
}));
get('/fap-archive/:archiveId', async (req, res) => {
  const archive = await getFapSubmissionArchiveDetail(req.params.archiveId);
  if (!archive) {
    res.status(404);
    return {error: 'FAP archive not found'};
  }
  return {success: true, archive};
});

const immutable = () => {
  throw new Problem(
    403,
    'Data arsip FAP submission bersifat permanen dan tidak dapat diubah atau dihapus (immutable).',
  );
};
for (const register of [put, post, patch, del])
  register(['/applications/:id/fap-archive', '/fap-archive/:archiveId'], immutable);
