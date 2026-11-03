import crypto from 'node:crypto';
import {z} from 'zod';
import {pool} from '../../db/pool';
import {Problem, ensure} from '../../domain';
import {requireRole} from '../../auth/session';
import {canEditLegal} from '@/lib/shared/deed-workflow';
import {
  createIntake,
  intakeCustomers,
  intakeDetail,
  listIntake,
  saveCustomerPic,
  transitionIntake,
} from '@/lib/server/db/repositories/intake';
import {saveBusiness} from '@/lib/server/db/repositories/business';
import {saveFinancialStatements} from '@/lib/server/db/repositories/financial-statements';
import {saveLegal} from '@/lib/server/db/repositories/legal';
import {getSubmitLock, verifyApplicationDocument} from '@/lib/server/db/repositories/documents';
import {getPreAnalysisData, savePreAnalysisData} from '@/lib/server/db/repositories/pre-analysis';
import {recordFapSubmissionArchive} from '@/lib/server/db/repositories/fap-archive';
import {get, post, put, patch} from '../router';
import {logActivity} from '@/lib/server/api/activity';

const detailOr404 = async (id: string) => {
  const application = await intakeDetail(id);
  ensure(application, 'Application not found', 404);
  return application;
};

/* ---------- customers ---------- */

get('/customers', () => intakeCustomers());

post('/customers', async req => {
  requireRole(req.actor, ['MKT']);
  const b = req.body || {};
  const companyName = String(b.companyName || '').trim();
  const companyType = String(b.companyType || '').trim();
  // A draft may be started before the customer's registration numbers are known: blank values get unique
  // placeholders (never a shared constant, which would merge unrelated customers) and are replaced when edited.
  const stamp = String(Date.now());
  const nib = String(b.nib || '').trim() || stamp;
  const npwp = String(b.npwp || '').trim() || `${stamp}${crypto.randomInt(10, 100)}`;
  ensure(companyName && companyType, 'Company name and type are required');
  ensure(/^\d{13}$/.test(nib), 'NIB must contain 13 digits');
  ensure(/^\d{15,16}$/.test(npwp.replace(/\D/g, '')), 'NPWP must contain 15 or 16 digits');

  const [existing] = await pool.query<any[]>(
    'SELECT id FROM business_partner WHERE nib=? OR npwp=? LIMIT 1',
    [nib, npwp],
  );
  const id = existing[0]?.id || crypto.randomUUID();
  await pool.execute(
    `INSERT INTO business_partner (id, company_name, company_type, nib, npwp, establishment_act_no, establishment_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE company_name=VALUES(company_name), company_type=VALUES(company_type), nib=VALUES(nib), npwp=VALUES(npwp),
       establishment_act_no=COALESCE(VALUES(establishment_act_no), establishment_act_no),
       establishment_date=COALESCE(VALUES(establishment_date), establishment_date)`,
    [id, companyName, companyType, nib, npwp, b.establishmentActNo || null, b.establishmentDate || null],
  );
  return {
    id,
    companyName,
    companyType,
    nib,
    npwp,
    establishmentActNo: b.establishmentActNo || null,
    establishmentDate: b.establishmentDate || null,
  };
});

/* ---------- applications: list / create / read ---------- */

get('/applications', () => listIntake());

const DEFAULT_PROFILE: Record<string, string> = {
  branchCode: 'JKT01',
  customerStatus: 'NEW',
  locationStatus: 'OWNED',
  repaymentSource: 'Operating Cash Flow',
  industrySegment: 'MINING',
  businessRole: 'CONTRACTOR',
};

async function createApplication(req: Parameters<Parameters<typeof post>[1]>[0]) {
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

post('/applications', async (req, res) => {
  res.status(201);
  return createApplication(req);
});
post('/intake/drafts', async (req, res) => {
  res.status(201);
  return createApplication(req);
});

get('/applications/:id', req => detailOr404(req.params.id));

/* ---------- pre-analysis ---------- */

get('/applications/:id/pre-analysis', async req => ({
  success: true,
  data: await getPreAnalysisData(req.params.id, await intakeDetail(req.params.id)),
}));
put('/applications/:id/pre-analysis', async req => {
  await savePreAnalysisData(req.params.id, req.body);
  return {success: true, data: req.body};
});

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

put('/applications/:id/business', async req => {
  requireRole(req.actor, ['MKT', 'CA']);
  const id = req.params.id;
  await detailOr404(id);
  await saveBusiness(id, req.body);
  return intakeDetail(id);
});

put('/applications/:id/page-1', async req => {
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
});

put('/applications/:id/page-2', async req => {
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
});

put(['/applications/:id/legal/draft', '/applications/:id/page-legal'], async req => {
  const id = req.params.id;
  const existing = await detailOr404(id);
  ensure(canEditLegal(req.actor, existing), 'Legal information is locked at this workflow stage', 403);
  const b = req.body || {};
  const legal = b.legal || (b.deeds ? b : Array.isArray(b) ? {deeds: b} : {});
  if (b.stakeholders && Array.isArray(legal?.deeds)) {
    const selected = legal.selectedDeedId || legal.deeds[0]?.id;
    const target = legal.deeds.find((d: any) => d.id === selected) || legal.deeds[0];
    if (target) {
      target.stakeholders = b.stakeholders;
      target._stakeholdersPassed = true;
    }
  }
  await saveLegal(id, legal, false);
  await logActivity(req.actor, id, existing.status, existing.status, 'Legal information updated');
  return intakeDetail(id);
});

put('/applications/:id/stage', async (req, res) => {
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
});

/* ---------- workflow ---------- */

post('/applications/:id/transition', async req => {
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
});

/* ---------- document checklist ---------- */

get('/applications/:id/checklist', async req => (await detailOr404(req.params.id)).documentChecks);

patch('/applications/:id/checklist/:checklistId/verify', async req => {
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
});

export {Problem};
