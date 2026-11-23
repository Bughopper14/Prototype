import {Controller, Get, Post, Put, Res} from '@nestjs/common';
import {z} from 'zod';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {requireAuthority} from '../auth/session';
import {ApplicationsService} from './applications.service';

@Controller(API_PREFIX)
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get('applications')
  list(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_APPLICATION_VIEW');
    return this.applications.list(req.actor);
  }

  @Post('applications')
  async create(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_APPLICATION_CREATE');
    const body = req.body || {};
    if (body.customerId) z.string().uuid().parse(body.customerId);
    res.status(201);
    return this.applications.create(body, req.actor);
  }

  @Get('applications/:id')
  detail(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_APPLICATION_VIEW');
    return this.applications.detailOr404(req.params.id, req.actor);
  }

  @Put('applications/:id/page-1')
  async saveProfilePage(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const id = req.params.id;
    const b = req.body || {};
    // Every part of the body that is written needs the authority of its section, and it is checked before anything
    // else (also before the application is looked up). A part of the body that is not listed here is never written.
    const needs: string[][] = [];
    if (b.profile || b.pic) needs.push(['CRM_CUSTOMER-PIC_EDIT']);
    if (b.bankReferences || (!b.profile && !b.pic && Array.isArray(b.projects))) needs.push(['CRM_BUSINESS-BANK_EDIT']);
    // FAP section 08 (financing proposal) and 09 (financial statements) are saved from the FAP form too
    if (b.proposal || b.financingProposal || b.financialStatements)
      needs.push(['CRM_FINANCING-UNIT_EDIT', 'CRM_FINANCIAL_EDIT']);
    // Section 05 (financing purposes) lives with the company profile
    if (!b.profile && !b.pic && b.financingPurposeDetail !== undefined) needs.push(['CRM_CUSTOMER-PIC_EDIT']);
    for (const any of needs.length ? needs : [['CRM_APPLICATION_VIEW']]) requireAuthority(req.actor, ...any);
    await this.applications.detailOr404(id, req.actor);
    if (!needs.length) return this.applications.detailOr404(id, req.actor); // nothing to write
    // The screen sends the updatedAt it loaded; it is checked once, by the first write of this request.
    const checked = !!(b.profile || b.pic);
    if (checked) await this.applications.saveCustomerAndContact(id, b, req.actor, b.expectedUpdatedAt);
    // FAP sections 05–09: only the sections present in the body are written.
    await this.applications.saveFapSections(id, b, req.actor, checked ? undefined : b.expectedUpdatedAt);
    return this.applications.detailOr404(id, req.actor);
  }

  /** Activity tab of one application. */
  @Get('applications/:id/activity')
  activity(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_APPLICATION-ACTIVITY_VIEW', 'CRM_ACTIVITY_VIEW');
    return this.applications.activityOf(req.params.id);
  }

  /** The workspace records what a save changed, field by field (the feed shows old → new values). */
  @Post('applications/:id/activity')
  recordActivity(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_APPLICATION_VIEW');
    const text = (max: number) =>
      z.preprocess(v => (v === null || v === undefined ? undefined : String(v)), z.string().max(max).optional());
    const body = z
      .object({
        section: z.string().min(1).max(100),
        tabIndex: z.number().int().min(0).max(99).nullable().optional(),
        title: z.string().min(1).max(255),
        details: z.string().max(20000).optional(),
        changes: z
          .array(
            z.object({
              section: text(100),
              subSection: text(200),
              field: text(100),
              label: z.preprocess(v => String(v ?? ''), z.string().max(200)),
              oldValue: text(5000),
              newValue: text(5000),
            }),
          )
          .max(500)
          .optional(),
      })
      .parse(req.body || {});
    res.status(201);
    return this.applications.recordClientActivity(req.params.id, body, req.actor);
  }

  /** Generates the FAP number on demand (the application is created without one). */
  @Post('applications/:id/fap-number')
  async generateFapNumber(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_APPLICATION_CREATE', 'CRM_WORKFLOW_SUBMIT', 'CRM_APPLICATION_EDIT');
    res.status(201);
    return this.applications.generateFapNumber(req.params.id, req.actor);
  }

  /** Submits a stage: locks it and starts the approval of the stage (and of its group when all its stages are submitted). Also the resubmit after a reject. */
  @Post('applications/:id/stages/:stageCode/submit')
  async submitOneStage(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_WORKFLOW_SUBMIT');
    const {remarks} = z.object({remarks: z.string().trim().max(10000).optional()}).parse(req.body || {});
    return this.applications.submitStage(req.params.id, req.params.stageCode, req.actor, remarks);
  }

  /** Asks for the approval of one document (a document with an approval step of its own); also its resubmit after a reject. */
  @Post('applications/:id/documents/:checklistId/submit-approval')
  async submitDocumentApproval(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_WORKFLOW_SUBMIT');
    return this.applications.submitDocumentApproval(req.params.id, req.params.checklistId, req.actor);
  }

  /** Asks for the approval of one row (one deed) of a repeating section; also its resubmit after a reject. */
  @Post('applications/:id/sections/:sectionCode/rows/:rowId/submit-approval')
  async submitSectionApproval(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_WORKFLOW_SUBMIT');
    return this.applications.submitSectionApproval(req.params.id, req.params.sectionCode, req.params.rowId, req.actor);
  }

  /** What a stage still lacks before it can be submitted (shown before the Submit button is pressed). */
  @Get('applications/:id/stages/:stageCode/check')
  stageCheck(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_APPLICATION_VIEW');
    return this.applications.stageCheck(req.params.id, req.params.stageCode);
  }

  /** The list of what is still missing for the final approval, shown when the last Approve is about to be given. */
  @Get('applications/:id/approval-check')
  approvalCheck(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_APPLICATION_VIEW');
    return this.applications.approvalCheck(req.params.id);
  }

  /**
   * Approve or Reject one approval step. There is no fixed authority here: the service lets through anyone who holds the authority of
   * that step (administrators always). A reject needs remarks.
   */
  @Post('applications/:id/approvals/:stepId/decision')
  async decide(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_APPLICATION_VIEW');
    const body = z
      .object({
        decision: z.enum(['APPROVED', 'REJECTED']),
        remarks: z.string().trim().max(10000).optional(),
        /** Rejecting a group: the stages of the group to open again (all of them when left out). */
        reopenStages: z.array(z.string().trim().min(1).max(50)).optional(),
      })
      .parse(req.body || {});
    return this.applications.decide(req.params.id, z.string().uuid().parse(req.params.stepId), req.actor, {...body, via: 'WEB'});
  }

  /** What waits for the signed-in person: pending approval steps of the authorities they hold. */
  @Get('approvals/inbox')
  inbox(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_APPLICATION_VIEW');
    return this.applications.inbox(req.actor);
  }
}
