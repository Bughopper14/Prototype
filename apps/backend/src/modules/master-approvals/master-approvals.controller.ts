import {Controller, Delete, Get, Post, Put, Res} from '@nestjs/common';
import {z} from 'zod';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {Problem} from '../../core/domain';
import type {Actor} from '../auth/session';
import {MasterApprovalsService} from './master-approvals.service';

/** Master approval is set up by administrators (Super Admin), like Workflow setup. */
function requireAdmin(actor: Actor) {
  if (!(actor.isAdmin || actor.role === 'ADMIN')) throw new Problem(403, 'Only an administrator can set up approvals');
}

const codeParam = (v: string) => z.string().trim().min(1).max(60).parse(v);

@Controller(API_PREFIX)
export class MasterApprovalsController {
  constructor(private readonly approvals: MasterApprovalsService) {}

  @Get('master-approvals')
  list(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAdmin(req.actor);
    return this.approvals.list();
  }

  /** The authorities a level can use. Declared before master-approvals/:code. */
  @Get('master-approvals/authorities')
  authorities(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAdmin(req.actor);
    return this.approvals.authorities();
  }

  @Post('master-approvals')
  create(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAdmin(req.actor);
    res.status(201);
    return this.approvals.create(req.body || {}, req.actor.username || null);
  }

  @Get('master-approvals/:code')
  get(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAdmin(req.actor);
    return this.approvals.get(codeParam(req.params.code));
  }

  @Put('master-approvals/:code')
  update(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAdmin(req.actor);
    return this.approvals.update(codeParam(req.params.code), req.body || {}, req.actor.username || null);
  }

  @Delete('master-approvals/:code')
  remove(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAdmin(req.actor);
    return this.approvals.remove(codeParam(req.params.code), req.actor.username || null);
  }

  @Post('master-approvals/:code/clone')
  clone(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAdmin(req.actor);
    res.status(201);
    return this.approvals.clone(codeParam(req.params.code), req.actor.username || null);
  }

  @Post('master-approvals/:code/activate')
  activate(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAdmin(req.actor);
    res.status(200);
    return this.approvals.activate(codeParam(req.params.code), req.actor.username || null);
  }

  @Post('master-approvals/:code/deactivate')
  deactivate(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAdmin(req.actor);
    res.status(200);
    return this.approvals.deactivate(codeParam(req.params.code), req.actor.username || null);
  }

  @Get('master-approvals/:code/history')
  history(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAdmin(req.actor);
    return this.approvals.history(codeParam(req.params.code));
  }
}
