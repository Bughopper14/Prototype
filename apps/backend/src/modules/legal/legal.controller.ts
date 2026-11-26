import {Controller, Post, Put, Res} from '@nestjs/common';
import {z} from 'zod';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {requireAuthority} from '../auth/session';
import {LegalService} from './legal.service';

@Controller(API_PREFIX)
export class LegalController {
  constructor(private readonly legal: LegalService) {}

  @Put('applications/:id/page-legal')
  saveLegalDraft(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_LEGAL_EDIT');
    return this.legal.saveDraft(req.params.id, req.body || {}, req.actor);
  }

  @Put('applications/:id/deeds/:deedId/draft')
  saveDeedDraft(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_LEGAL_EDIT');
    return this.legal.saveDeed(req.params.id, req.params.deedId, req.body?.deed, req.actor);
  }

  @Post('applications/:id/deeds/:deedId/approval')
  deedApproval(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    // Submitting needs legal edit right; approve/reject/remarks are for legal approvers or administrators
    if (!req.actor.isAdmin && req.actor.role !== 'ADMIN') {
      const auths = req.actor.authorities || [];
      const hasApprovalAuth =
        auths.includes('CRM_LEGAL_EDIT') ||
        auths.includes('CRM_DEED-REVIEW_LEGAL_APPROVE') ||
        auths.includes('CRM_DEED-REVIEW_BP_APPROVE') ||
        auths.includes('CRM_DEED-REVIEW_BS_APPROVE');
      if (!hasApprovalAuth) {
        requireAuthority(req.actor, 'CRM_LEGAL_EDIT');
      }
    }
    const body = z
      .object({
        action: z.enum(['SUBMIT', 'APPROVE', 'REJECT', 'REMARKS']),
        revision: z.number().int().positive(),
        comments: z.string().trim().max(10000).default(''),
      })
      .parse(req.body);
    return this.legal.deedApproval(req.params.id, req.params.deedId, body, req.actor);
  }
}
