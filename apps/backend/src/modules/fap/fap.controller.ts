import {Controller, Delete, Get, Patch, Post, Put, Res} from '@nestjs/common';
import {exec} from '../../core/db/query';
import {Problem} from '../../core/domain';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {intakeDetail} from '../applications/intake.repository';
import {requireAuthority} from '../auth/session';
import {getSubmitLock, saveFapComparison, saveFapRemarks} from '../documents/documents.repository';
import {
  getFapSubmissionArchiveDetail,
  getFapSubmissionArchives,
  recordFapSubmissionArchive,
} from './fap-archive.repository';
import {computeFapDiffs} from './fap-diff';
import {clearFapDifferences, compareFapDocumentOcr, latestFapFile} from './fap-comparison';

const ARCHIVE_PATHS = ['applications/:id/fap-archive', 'fap-archive/:archiveId'];

const immutable = () => {
  throw new Problem(
    403,
    'Data arsip FAP submission bersifat permanen dan tidak dapat diubah atau dihapus (immutable).',
  );
};

@Controller(API_PREFIX)
export class FapController {
  @Get('applications/:id/fap-comparison')
  async comparison(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_view_app_documents', 'crm_view_document_desk');
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
  }

  @Post('applications/:id/fap-comparison/remarks')
  async saveRemarks(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_edit_app_legal', 'crm_verify_app_documents');
    const remarks = String(req.body.remarks || '');
    await saveFapRemarks(req.params.id, remarks);
    return {success: true, remarks, comparison: (await getSubmitLock(req.params.id)).ocrComparison};
  }

  @Post('applications/:id/fap-comparison/run')
  async runComparison(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_edit_app_legal', 'crm_verify_app_documents');
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
  }

  @Post('applications/:id/fap-changes/approve')
  async approveChanges(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_edit_app_legal', 'crm_verify_app_documents');
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
  }

  @Post('applications/:id/fap-changes/dismiss')
  async dismissChanges(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_edit_app_legal', 'crm_verify_app_documents');
    await clearFapDifferences(req.params.id, req.body?.remarks);
    return {success: true};
  }

  @Get('applications/:id/fap-archive')
  async archives(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_view_app_documents', 'crm_view_document_desk');
    return {
      success: true,
      archives: await getFapSubmissionArchives(req.params.id),
    };
  }

  @Get('fap-archive/:archiveId')
  async archive(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_view_app_documents', 'crm_view_document_desk');
    const archive = await getFapSubmissionArchiveDetail(req.params.archiveId);
    if (!archive) {
      res.status(404);
      return {error: 'FAP archive not found'};
    }
    return {success: true, archive};
  }

  /* The submission archive is immutable: every write to it is refused. */
  @Put(ARCHIVE_PATHS)
  replaceArchive() {
    return immutable();
  }

  @Post(ARCHIVE_PATHS)
  writeArchive() {
    return immutable();
  }

  @Patch(ARCHIVE_PATHS)
  updateArchive() {
    return immutable();
  }

  @Delete(ARCHIVE_PATHS)
  deleteArchive() {
    return immutable();
  }
}
