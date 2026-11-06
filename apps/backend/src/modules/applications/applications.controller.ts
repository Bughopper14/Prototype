import {Controller, Get, Patch, Post, Put, Res} from '@nestjs/common';
import {z} from 'zod';
import {pool} from '../../core/db/pool';
import {ensure} from '../../core/domain';
import {detailOr404} from './application-detail';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {logActivity} from '../activity/activity-log';
import {saveBusiness} from './business.repository';
import {saveFinancialStatements} from './financial-statements.repository';
import {createIntake, intakeDetail, listIntake, saveCustomerPic, transitionIntake} from './intake.repository';
import {requireRole} from '../auth/session';
import {getSubmitLock, verifyApplicationDocument} from '../documents/documents.repository';
import {recordFapSubmissionArchive} from '../fap/fap-archive.repository';

const DEFAULT_PROFILE: Record<string, string> = {
  branchCode: 'JKT01',
  customerStatus: 'NEW',
  locationStatus: 'OWNED',
  repaymentSource: 'Operating Cash Flow',
  industrySegment: 'MINING',
  businessRole: 'CONTRACTOR',
};

async function createApplication(req: ApiRequest) {
  requireRole(req.actor, ['MKT']);
  const body = req.body || {};
  const profile: Record<string, any> = {...DEFAULT_PROFILE, ...body};
  for (const key of Object.keys(DEFAULT_PROFILE))
    if (!String(profile[key] ?? '').trim()) profile[key] = DEFAULT_PROFILE[key];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(profile.email || '').trim())) profile.email = '';

  const customerId = body.customerId ? z.string().uuid().parse(body.customerId) : undefined;
  const category = body.customerCategory || body.customerStatus || (customerId ? 'EXISTING' : 'NEW');
  let customer: Record<string, any> = body.customer || {};
  if (customerId) {
    const [rows] = await pool.query<any[]>('SELECT * FROM business_partner WHERE id=?', [customerId]);
    ensure(rows[0], 'Customer not found', 404);
    const c = rows[0];
    customer = {
      companyName: c.company_name,
      companyType: c.company_type,
      nib: c.nib,
      npwp: c.npwp,
      establishmentActNo: c.establishment_act_no,
      establishmentDate: c.establishment_date,
      nibDate: c.nib_date,
    };
  }
  const created = await createIntake({customerCategory: category, customerId, customer, profile});
  await logActivity(req.actor, created.id, 'DRAFT', 'DRAFT', 'Application created');
  return detailOr404(created.id);
}

/* ---------- page saves ---------- */

/** Business sections are persisted together, so unspecified sections are carried over from the saved record. */
async function saveBusinessMerged(id: string, patchBody: Record<string, any>) {
  const current = await detailOr404(id);
  await saveBusiness(id, {
    projects: patchBody.projects ?? current.projects ?? [],
    bankReferences: patchBody.bankReferences ?? current.bankReferences ?? [],
    proposal: patchBody.proposal ?? current.proposal ?? null,
  });
}

@Controller(API_PREFIX)
export class ApplicationsController {
  @Get('applications')
  list(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    return listIntake();
  }

  @Post('applications')
  async create(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    res.status(201);
    return createApplication(req);
  }

  @Post('intake/drafts')
  async createDraft(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    res.status(201);
    return createApplication(req);
  }

  @Get('applications/:id')
  detail(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    return detailOr404(req.params.id);
  }

  @Put('applications/:id/business')
  async saveBusiness(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireRole(req.actor, ['MKT', 'CA']);
    const id = req.params.id;
    await detailOr404(id);
    await saveBusiness(id, req.body);
    return intakeDetail(id);
  }

  @Put('applications/:id/page-1')
  async saveProfilePage(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const id = req.params.id;
    const existing = await detailOr404(id);
    const b = req.body || {};
    if (b.profile || b.pic) {
      if (Array.isArray(b.projects)) await saveBusinessMerged(id, {projects: b.projects});
      await saveCustomerPic(id, b);
    }
    if (b.bankReferences || b.proposal || (!b.profile && !b.pic && Array.isArray(b.projects))) {
      await saveBusinessMerged(id, {
        projects: b.projects,
        bankReferences: b.bankReferences,
        proposal: b.proposal,
      });
    }
    await logActivity(
      req.actor,
      id,
      existing.status,
      existing.status,
      'Profile and business information updated',
    );
    return intakeDetail(id);
  }

  @Put('applications/:id/page-2')
  async saveFinancialPage(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const id = req.params.id;
    const existing = await detailOr404(id);
    if (req.body?.proposal) await saveBusinessMerged(id, {proposal: req.body.proposal});
    if (req.body?.financialStatements)
      await saveFinancialStatements(id, req.body.financialStatements, req.actor.role);
    await logActivity(
      req.actor,
      id,
      existing.status,
      existing.status,
      'Financing and financial statements updated',
    );
    return intakeDetail(id);
  }

  @Put('applications/:id/stage')
  async updateStage(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const id = req.params.id;
    const stage = String(req.body?.stage || 'Pre-analysis');
    if (stage === 'Pre-analysis') {
      const lock = await getSubmitLock(id).catch(() => null);
      if (lock?.isLocked) {
        res.status(403);
        return {error: 'Please upload the signed FAP Stage document in the Documents tab first.'};
      }
    }
    await pool.query(
      'UPDATE application_submit_lock SET stage=?, updated_at=CURRENT_TIMESTAMP(3) WHERE application_id=?',
      [stage === 'Pre-analysis' ? 'PRE_ANALYSIS' : 'FAP_STAGE', id],
    );
    if (stage === 'Pre-analysis') {
      try {
        await recordFapSubmissionArchive(id, await intakeDetail(id), req.actor, req.body?.remarks);
      } catch (e) {
        console.error('recordFapSubmissionArchive error on stage update:', e);
      }
    }
    return {success: true, stage};
  }

  @Post('applications/:id/transition')
  async transition(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const id = req.params.id;
    const {action, comments} = z
      .object({
        action: z.enum([
          'SUBMIT_TO_BS',
          'VERIFY_BS',
          'START_REVIEW',
          'RECOMMEND_CA',
          'RECOMMEND_LEGAL',
          'APPROVE_COMMITTEE',
          'REJECT_COMMITTEE',
          'RETURN',
        ]),
        comments: z.string().trim().max(10000).default(''),
      })
      .parse(req.body);
    const before = await detailOr404(id);
    const updated = await transitionIntake(id, action, req.actor, comments);
    await logActivity(
      req.actor,
      id,
      before.status,
      updated?.status ?? before.status,
      comments || action.replaceAll('_', ' '),
    );
    return updated;
  }

  @Get('applications/:id/checklist')
  async checklist(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    return (await detailOr404(req.params.id)).documentChecks;
  }

  @Patch('applications/:id/checklist/:checklistId/verify')
  async verifyChecklistItem(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireRole(req.actor, ['BS', 'CA', 'LEGAL']);
    const body = z
      .object({
        department: z.enum(['BS', 'CA', 'LEGAL']),
        isVerified: z.boolean(),
        registrationDate: z.string().date().nullable().optional(),
        expiredDate: z.string().date().nullable().optional(),
        dataSummary: z.string().max(10000).optional(),
        notes: z.string().max(10000).optional(),
      })
      .parse(req.body);
    const isAdmin = req.actor.isAdmin || req.actor.role === 'ADMIN';
    if (!isAdmin) ensure(body.department === req.actor.role, 'Cannot verify for another department', 403);
    const id = req.params.id;
    await detailOr404(id);
    await verifyApplicationDocument(id, req.params.checklistId, body, isAdmin);
    return intakeDetail(id);
  }
}
