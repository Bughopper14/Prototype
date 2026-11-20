import {Controller, Delete, Get, Post, Put, Res} from '@nestjs/common';
import {z} from 'zod';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {requireAuthority, type Actor} from '../auth/session';
import {MasterApprovalsService} from './master-approvals.service';

/** Master approval is set up by administrators (Super Admin), like Workflow setup. */
const MASTER_APPROVAL_VIEW = 'CRM_MASTER-APPROVAL_VIEW';
const MASTER_APPROVAL_EDIT = 'CRM_MASTER-APPROVAL_EDIT';
/** Reading needs the view authority (or the edit one); changing needs the edit authority. Administrators pass both. */
const requireView = (actor: Actor) => requireAuthority(actor, MASTER_APPROVAL_VIEW, MASTER_APPROVAL_EDIT);
const requireEdit = (actor: Actor) => requireAuthority(actor, MASTER_APPROVAL_EDIT);

const codeParam = (v: string) => z.string().trim().min(1).max(60).parse(v);

@Controller(API_PREFIX)
export class MasterApprovalsController {
  constructor(private readonly approvals: MasterApprovalsService) {}

  @Get('master-approvals')
  list(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireView(req.actor);
    return this.approvals.list();
  }

  /** The authorities a level can use. Declared before master-approvals/:code. */
  @Get('master-approvals/authorities')
  authorities(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireEdit(req.actor);
    return this.approvals.authorities();
  }

  @Post('master-approvals')
  create(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireEdit(req.actor);
    res.status(201);
    return this.approvals.create(req.body || {}, req.actor.username || null);
  }

  @Get('master-approvals/:code')
  get(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireView(req.actor);
    return this.approvals.get(codeParam(req.params.code));
  }

  @Put('master-approvals/:code')
  update(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireEdit(req.actor);
    return this.approvals.update(codeParam(req.params.code), req.body || {}, req.actor.username || null);
  }

  @Delete('master-approvals/:code')
  remove(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireEdit(req.actor);
    return this.approvals.remove(codeParam(req.params.code), req.actor.username || null);
  }

  @Get('master-approvals/:code/history')
  history(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireView(req.actor);
    return this.approvals.history(codeParam(req.params.code));
  }
}
