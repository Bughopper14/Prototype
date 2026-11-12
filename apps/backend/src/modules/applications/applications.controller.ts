import {randomUUID} from 'node:crypto';
import {Controller, Get, Param, Patch, Post, Put, Res} from '@nestjs/common';
import {cleanNullableString, resolveWorkflowStageByCode} from '../../core/db/crm-lookups';
import {pool} from '../../core/db/pool';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {Problem} from '../../core/domain';
import {logActivity} from '../activity/activity-log';
import {requireAuthority} from '../auth/session';
import {seedDocumentChecklist} from '../documents/store/seed';
import {detailOr404} from './application-detail';
import {actorMeta, dateStr} from './intake/helpers';
import {createIntake, intakeDetail, listIntake, saveCustomerPic, transitionIntake} from './intake.repository';

@Controller(API_PREFIX)
export class ApplicationsController {
  @Get('applications')
  list(@ApiReq() req: ApiRequest) {
    requireAuthority(req.actor, 'crm_view_applications');
    return listIntake();
  }

  @Post('applications')
  async create(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_create_application');
    const created = await createIntake(req.body, undefined, req.actor);
    if (!created) throw new Problem(500, 'Failed to create application.');
    await seedDocumentChecklist(created.id);
    logActivity(
      req.actor,
      created.id,
      null,
      created.status || 'DRAFT',
      `Created application ${created.fapNumber} (${created.companyName})`,
      {actionType: 'CREATE', sectionName: 'Application Intake'},
    );
    const hydrated = await intakeDetail(created.id);
    return res.status(201).json(hydrated);
  }

  @Get('applications/:id')
  async detail(@ApiReq() req: ApiRequest, @Param('id') id: string) {
    requireAuthority(req.actor, 'crm_view_applications');
    return detailOr404(id);
  }

  @Put('applications/:id/page-1')
  async savePage1(@ApiReq() req: ApiRequest, @Param('id') id: string) {
    requireAuthority(
      req.actor,
      'crm_edit_app_customer_pic',
      'crm_edit_app_business_banks',
      'crm_edit_app_financial',
      'crm_edit_app_financing_units',
    );
    const updated = await saveCustomerPic(id, req.body, req.actor);
    logActivity(req.actor, id, updated?.status || null, updated?.status || null, 'Updated FAP application details');
    return updated;
  }

  @Put('applications/:id/page-2')
  savePage2(@ApiReq() req: ApiRequest, @Param('id') id: string) {
    return this.savePage1(req, id);
  }

  @Put('applications/:id/stage')
  async updateStage(@ApiReq() req: ApiRequest, @Param('id') id: string) {
    requireAuthority(req.actor, 'crm_create_application', 'crm_edit_app_customer_pic', 'crm_workflow_submit');
    const targetStageName = String(req.body?.stage || '');
    const stageCode = targetStageName.toLowerCase().includes('pre')
      ? 'PRE_ANALYSIS'
      : targetStageName.toLowerCase().includes('iclf')
        ? 'ICLF'
        : 'FAP_STAGE';
    const stage = await resolveWorkflowStageByCode(stageCode);
    if (!stage) throw new Problem(422, `Unknown workflow stage "${targetStageName}".`);

    const [appRows] = await pool.query<any[]>(
      'SELECT current_status_id FROM crm_applications WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [id],
    );
    if (!appRows[0]) throw new Problem(404, 'Application not found.');
    const {userId, actorName} = actorMeta(req.actor);

    await pool.execute(
      `INSERT INTO crm_application_stage_progress (
        id, application_id, stage_id, status_id, is_locked, started_at, assigned_user_id, assigned_user_name, created_by, updated_by
      ) VALUES (?,?,?,?,0,CURRENT_TIMESTAMP(3),?,?,?,?)
      ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP(3), updated_by = VALUES(updated_by)`,
      [randomUUID(), id, stage.id, appRows[0].current_status_id, userId, actorName, actorName, actorName],
    );
    return detailOr404(id);
  }

  @Post('applications/:id/transition')
  async transition(@ApiReq() req: ApiRequest, @Param('id') id: string) {
    const before = await detailOr404(id);
    const updated = await transitionIntake(id, req.body, req.actor);
    logActivity(
      req.actor,
      id,
      before.status || null,
      updated?.status || null,
      cleanNullableString(req.body?.comments) || `Transitioned status to ${updated?.status || ''}`,
    );
    return updated;
  }

  @Patch('applications/:id/checklist/:checklistId/verify')
  async verifyChecklist(
    @ApiReq() req: ApiRequest,
    @Param('id') id: string,
    @Param('checklistId') checklistId: string,
  ) {
    requireAuthority(req.actor, 'crm_verify_app_documents');
    const {actorName, actorRole} = actorMeta(req.actor);
    const dept = String(req.body?.department || req.body?.role || actorRole).toUpperCase();
    const checked = req.body?.checked === undefined ? undefined : req.body.checked ? 1 : 0;

    const deptCol =
      dept === 'MKT'
        ? 'checked_by_mkt'
        : dept === 'BS'
          ? 'checked_by_bs'
          : dept === 'CA'
            ? 'checked_by_ca'
            : dept === 'LEGAL'
              ? 'checked_by_legal'
              : null;

    const sets: string[] = ['updated_at = CURRENT_TIMESTAMP(3)', 'updated_by = ?'];
    const params: any[] = [actorName];

    if (deptCol && checked !== undefined) {
      sets.push(`${deptCol} = ?`);
      params.push(checked);
    }
    if (req.body?.status) {
      const st = String(req.body.status).toUpperCase();
      if (['PENDING', 'UPLOADED', 'VERIFIED', 'REJECTED'].includes(st)) {
        sets.push('status = ?');
        params.push(st);
      }
    } else if (checked === 1) {
      sets.push(`status = 'VERIFIED'`);
    }
    if (req.body?.notes !== undefined) {
      sets.push('notes = ?');
      params.push(cleanNullableString(req.body.notes));
    }
    if (req.body?.registrationDate !== undefined) {
      sets.push('registration_date = ?');
      params.push(dateStr(req.body.registrationDate));
    }
    if (req.body?.expiredDate !== undefined) {
      sets.push('expired_date = ?');
      params.push(dateStr(req.body.expiredDate));
    }
    if (req.body?.dataSummary !== undefined) {
      sets.push('data_summary = ?');
      params.push(cleanNullableString(req.body.dataSummary));
    }

    await pool.execute(
      `UPDATE crm_application_document_checklists SET ${sets.join(', ')} WHERE id = ? AND application_id = ?`,
      [...params, checklistId, id],
    );
    return detailOr404(id);
  }
}
