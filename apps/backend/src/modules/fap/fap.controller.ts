import {Controller, Delete, Get, Patch, Post, Put, Res} from '@nestjs/common';
import {Problem, ensure} from '../../core/domain';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {ApplicationsService} from '../applications/applications.service';
import {requireAuthority} from '../auth/session';
import {FapComparisonService} from './fap-comparison.service';
import {FapFreezeRepository} from './fap-freeze.repository';

const ARCHIVE_PATHS = ['applications/:id/fap-archive', 'fap-archive/:archiveId'];

const immutable = () => {
  throw new Problem(
    403,
    'Data arsip FAP submission bersifat permanen dan tidak dapat diubah atau dihapus (immutable).',
  );
};

@Controller(API_PREFIX)
export class FapController {
  constructor(
    private readonly comparisons: FapComparisonService,
    private readonly applications: ApplicationsService,
    private readonly freezes: FapFreezeRepository,
  ) {}

  @Get('applications/:id/fap-comparison')
  async comparison(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_DOCUMENT_VIEW', 'CRM_DOCUMENT-DESK_VIEW');
    return {status: 'success', comparison: await this.comparisons.get(req.params.id, req.actor, req.query?.fileId ? String(req.query.fileId) : undefined)};
  }

  @Post('applications/:id/fap-comparison/remarks')
  async saveRemarks(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_LEGAL_EDIT');
    const remarks = String(req.body.remarks || '');
    await this.comparisons.saveRemarks(req.params.id, remarks, req.actor);
    return {success: true, remarks, comparison: await this.comparisons.get(req.params.id, req.actor)};
  }

  @Post('applications/:id/fap-comparison/run')
  async runComparison(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_LEGAL_EDIT');
    await this.applications.detailOr404(req.params.id, req.actor);
    const comparison = await this.comparisons.run(req.params.id, req.actor, req.body?.fileId ? String(req.body.fileId) : undefined);
    ensure(comparison, 'Belum ada dokumen FAP yang diunggah', 400);
    return {success: true, comparison};
  }

  /** Every FAP freeze of the application (crm_frozen_fap_*), newest first. */
  @Get('applications/:id/fap-archive')
  async archives(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_DOCUMENT_VIEW', 'CRM_DOCUMENT-DESK_VIEW');
    await this.applications.detailOr404(req.params.id, req.actor);
    return {success: true, archives: await this.freezes.list(req.params.id)};
  }

  /* A freeze is immutable: every write to it is refused. */
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
