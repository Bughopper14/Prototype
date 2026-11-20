import {Controller, Delete, Get, Post, Put, Res} from '@nestjs/common';
import {z} from 'zod';
import {CrmDatabase} from '../../core/db/crm-database';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {ensure} from '../../core/domain';
import {recordActivity} from '../activity/activity-log';
import {ApplicationsRepository} from '../applications/repositories/applications.repository';
import {groupsOf, stagesOf, WorkflowConfigRepository} from '../applications/workflow/workflow-config.repository';
import {requireAuthority, type Actor} from '../auth/session';
import {DocumentsRepository} from '../documents/documents.repository';
import {UsersApproversLookup} from './users-approvers.lookup';
import {WorkflowsService} from './workflows.service';

/** Workflow setup is for administrators (Super Admin); the authorities below are checked for the rest. */
const WORKFLOW_VIEW = 'CRM_WORKFLOW_VIEW';
const WORKFLOW_EDIT = 'CRM_WORKFLOW_EDIT';
/** Reading needs the view authority (or the edit one); changing needs the edit authority. Administrators pass both. */
const requireView = (actor: Actor) => requireAuthority(actor, WORKFLOW_VIEW, WORKFLOW_EDIT);
const requireEdit = (actor: Actor) => requireAuthority(actor, WORKFLOW_EDIT);

const uuidParam = (v: string) => z.string().uuid().parse(v);

@Controller(API_PREFIX)
export class WorkflowsController {
  constructor(
    private readonly workflows: WorkflowsService,
    private readonly db: CrmDatabase,
    private readonly apps: ApplicationsRepository,
    private readonly documents: DocumentsRepository,
    private readonly workflowRepo: WorkflowConfigRepository,
    private readonly approvers: UsersApproversLookup,
  ) {}

  /* ---------- Workflow setup (administrators) ---------- */

  @Get('workflows')
  list(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireView(req.actor);
    return this.workflows.list();
  }

  /** The groups and stages of the active workflow (for the start of a new application). */
  @Get('workflows/layout')
  async layout(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_APPLICATION_VIEW');
    const config = await this.workflowRepo.load(await this.workflowRepo.activeFreezeId());
    return {groups: groupsOf(config), stages: stagesOf(config)};
  }

  /** Departments and active users, for choosing who approves an application. Declared before workflows/:id. */
  @Get('workflows/approvers')
  approverChoices(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_DASHBOARD_ACCESS');
    return this.approvers.list();
  }

  @Get('workflows/catalog')
  catalog(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireView(req.actor);
    return this.workflows.catalog();
  }

  @Post('workflows')
  async create(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireEdit(req.actor);
    const body = z
      .object({
        name: z.string().trim().min(1).max(150),
        description: z.string().trim().max(500).nullish(),
      })
      .parse(req.body || {});
    res.status(201);
    return this.workflows.create(body, req.actor.username || null);
  }

  @Get('workflows/:id')
  get(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireView(req.actor);
    return this.workflows.get(uuidParam(req.params.id));
  }

  @Put('workflows/:id')
  rename(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireEdit(req.actor);
    const body = z.object({name: z.string().trim().min(1).max(150).optional(), description: z.string().trim().max(500).nullish()}).parse(req.body || {});
    return this.workflows.rename(uuidParam(req.params.id), body, req.actor.username || null);
  }

  @Put('workflows/:id/definition')
  saveDefinition(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireEdit(req.actor);
    return this.workflows.saveDefinition(uuidParam(req.params.id), req.body, req.actor.username || null);
  }

  @Post('workflows/:id/validate')
  validate(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireView(req.actor);
    res.status(200);
    return this.workflows.validate(uuidParam(req.params.id));
  }

  @Post('workflows/:id/activate')
  activate(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireEdit(req.actor);
    res.status(200);
    return this.workflows.activate(uuidParam(req.params.id), req.actor.name || req.actor.username || null);
  }

  @Post('workflows/:id/deactivate')
  deactivate(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireEdit(req.actor);
    res.status(200);
    return this.workflows.deactivate(uuidParam(req.params.id), req.actor.name || req.actor.username || null);
  }

  /** Deletes the master workflow; its freezes stay. */
  @Delete('workflows/:id')
  remove(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireEdit(req.actor);
    return this.workflows.remove(uuidParam(req.params.id));
  }

  /** The freezes of a workflow (every create or edit). */
  @Get('workflows/:id/history')
  history(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireView(req.actor);
    return this.workflows.history(uuidParam(req.params.id));
  }

  /* ---------- Documents of one application: add or remove against the workflow's checklist ---------- */

  @Get('applications/:id/document-options')
  async documentOptions(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_APPLICATION_VIEW');
    const app = await this.apps.get(uuidParam(req.params.id));
    ensure(app, 'Application not found', 404);
    const wf = await this.workflowRepo.load(app.workflow_freeze_id);
    return {
      ...(await this.documents.overrideOptions(app.id, app.workflow_freeze_id)),
      stages: wf.stages.map(s => ({code: s.code, name: s.name, departmentCode: s.departmentCode})),
      departments: await this.workflows.departments(),
    };
  }

  @Post('applications/:id/document-overrides')
  async addOverride(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_DOCUMENT_UPLOAD');
    const body = z
      .object({
        action: z.enum(['ADD', 'REMOVE']),
        stageCode: z.string().trim().min(1),
        /** The code of a document the workflow offers in this stage. */
        workflowDocumentCode: z.string().trim().max(60).nullish(),
        documentCode: z.string().trim().max(60).nullish(),
        customName: z.string().trim().max(150).nullish(),
        description: z.string().trim().max(500).nullish(),
        departmentCode: z.string().trim().max(30).nullish(),
        isMandatory: z.boolean().nullish(),
        reason: z.string().trim().max(500).nullish(),
      })
      .parse(req.body || {});
    ensure(body.action !== 'REMOVE' || body.reason, 'Give the reason for removing the document', 422);
    ensure(body.action !== 'ADD' || body.departmentCode, 'Choose the department responsible for the document', 422);
    ensure(body.action !== 'ADD' || (await this.workflows.departments()).some(d => d.code === body.departmentCode), 'Department not found', 422);
    const app = await this.apps.get(uuidParam(req.params.id));
    ensure(app, 'Application not found', 404);
    const wf = await this.workflowRepo.load(app.workflow_freeze_id);
    const stage = wf.stageByCode.get(body.stageCode);
    ensure(stage, 'Stage not found in the workflow of this application', 422);
    const userName = req.actor.name || req.actor.username;
    await this.db.transaction(async conn => {
      await this.documents.addOverride(conn, {
        applicationId: app.id,
        workflowFreezeId: wf.id,
        stageCode: stage.code,
        action: body.action,
        workflowDocumentCode: body.workflowDocumentCode,
        documentCode: body.documentCode,
        customName: body.customName,
        description: body.description,
        departmentCode: body.departmentCode,
        isMandatory: body.isMandatory,
        reason: body.reason,
        userId: Number.isInteger(req.actor.portalUserId) ? req.actor.portalUserId : null,
        userName,
      });
    });
    await recordActivity(
      {
        applicationId: app.id,
        stageCode: stage.code,
        section: 'Documents',
        tabIndex: 6,
        actionType: 'UPDATE',
        title: body.action === 'ADD' ? 'Document added to the checklist' : 'Document removed from the checklist',
        details: [body.customName || body.documentCode, body.reason].filter(Boolean).join(' · '),
      },
      req.actor,
    );
    res.status(201);
    return this.documents.overrideOptions(app.id, app.workflow_freeze_id);
  }

  @Delete('applications/:id/document-overrides/:overrideId')
  async cancelOverride(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_DOCUMENT_UPLOAD');
    const app = await this.apps.get(uuidParam(req.params.id));
    ensure(app, 'Application not found', 404);
    await this.db.transaction(conn =>
      this.documents.cancelOverride(conn, app.id, app.workflow_freeze_id, uuidParam(req.params.overrideId), req.actor.username || 'system'),
    );
    return this.documents.overrideOptions(app.id, app.workflow_freeze_id);
  }
}

