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
    requireAuthority(req.actor, 'crm_edit_app_legal');
    return this.legal.saveDraft(req.params.id, req.body || {}, req.actor);
  }

  @Put('applications/:id/deeds/:deedId/draft')
  saveDeedDraft(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_edit_app_legal');
    return this.legal.saveDeed(req.params.id, req.params.deedId, req.body?.deed, req.actor);
  }

  @Post('applications/:id/deeds/:deedId/review')
  reviewDeed(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    // Submitting needs the right to edit legal data, the other actions the right to approve deeds (checked per action)
    requireAuthority(req.actor, 'crm_edit_app_legal', 'crm_deed_approve');
    const body = z
      .object({
        action: z.enum(['SUBMIT', 'APPROVE', 'REJECT', 'REMARKS']),
        revision: z.number().int().positive(),
        comments: z.string().trim().max(10000).default(''),
      })
      .parse(req.body);
    return this.legal.review(req.params.id, req.params.deedId, body, req.actor);
  }
}
