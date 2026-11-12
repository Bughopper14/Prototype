import {GetObjectCommand} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import {Controller, Delete, Get, Param, Post, Res} from '@nestjs/common';
import fs from 'node:fs/promises';
import path from 'node:path';
import {many} from '../../core/db/query';
import {Problem, ensure} from '../../core/domain';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {Public} from '../../core/http/public.decorator';
import {filesDir, putStoredFile, removeStoredDocument, s3} from '../../core/storage';
import {logActivity} from '../activity/activity-log';
import {intakeDetail} from '../applications/intake.repository';
import {requireAuthority, signFileToken, verifyFileToken} from '../auth/session';
import {compareFapDocumentOcr, isFapChecklist} from '../fap/fap-comparison';
import {
  deleteApplicationDocumentFile,
  readDocumentFile,
  uploadApplicationDocument,
} from './documents.repository';

@Controller(API_PREFIX)
export class DocumentsController {
  @Get('document-desk')
  async desk(@ApiReq() req: ApiRequest) {
    requireAuthority(req.actor, 'crm_view_documents');
    return many(`
      SELECT
        chk.id,
        chk.id AS checklist_id,
        chk.application_id,
        chk.assigned_role,
        chk.is_mandatory,
        chk.status,
        chk.notes,
        chk.checked_by_mkt,
        chk.checked_by_bs,
        chk.checked_by_ca,
        chk.checked_by_legal,
        dt.code AS code,
        dt.code AS document_code,
        dt.name AS document_name,
        dt.title AS document_title,
        dt.department_code AS department,
        a.fap_registration_number AS fap_number,
        ws.code AS application_status,
        COALESCE(p.company_name, c.company_name) AS company_name,
        COUNT(f.id) AS file_count
      FROM crm_application_document_checklists chk
      JOIN crm_master_document_types dt ON dt.id = chk.document_type_id
      JOIN crm_applications a ON a.id = chk.application_id AND a.deleted_at IS NULL
      JOIN crm_master_workflow_statuses ws ON ws.id = a.current_status_id
      LEFT JOIN crm_fap_application_profiles p ON p.application_id = a.id
      LEFT JOIN crm_master_business_partners c ON c.id = a.customer_id
      LEFT JOIN crm_application_document_files f
        ON f.checklist_id = chk.id AND f.deleted_at IS NULL AND f.is_current_active = 1
      GROUP BY
        chk.id, chk.application_id, chk.assigned_role, chk.is_mandatory, chk.status, chk.notes,
        chk.checked_by_mkt, chk.checked_by_bs, chk.checked_by_ca, chk.checked_by_legal,
        dt.code, dt.name, dt.title, dt.department_code, dt.sort_order,
        a.fap_registration_number, ws.code, company_name, a.created_at
      ORDER BY a.created_at DESC, dt.sort_order ASC
    `);
  }

  @Post('applications/:id/documents/upload')
  async upload(@ApiReq() req: ApiRequest, @Param('id') id: string, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_upload_app_documents');
    const body = req.body || {};
    const uploaded = req.file;
    let buffer: Buffer;
    let fileName: string;
    let mimeType: string;

    if (uploaded) {
      buffer = uploaded.buffer;
      fileName = String(body.fileName || uploaded.originalname || 'document.bin').trim();
      mimeType = String(body.mimeType || uploaded.mimetype || 'application/octet-stream').trim();
    } else {
      fileName = String(body.fileName || body.filename || 'document.bin').trim();
      mimeType = String(body.mimeType || body.contentType || 'application/octet-stream').trim();
      const rawBase64 = String(body.fileData || body.contentBase64 || body.base64 || '');
      const cleanB64 = rawBase64.includes(',') ? rawBase64.split(',').pop()! : rawBase64;
      ensure(cleanB64, 'File content is required.', 422);
      buffer = Buffer.from(cleanB64, 'base64');
    }

    const docCode = body.documentCode || body.code || body.docCode;
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileKey = `${id}-${Date.now()}-${safeName}`;
    await putStoredFile(fileKey, buffer, mimeType);

    const saved = await uploadApplicationDocument(id, {
      checklistId: body.checklistId,
      code: docCode,
      fileName,
      fileKey,
      storedPath: `/files/${fileKey}`,
      fileSize: buffer.length,
      mimeType,
      uploadedBy: req.actor?.name || req.actor?.username || 'System',
      notes: body.notes,
      registrationDate: body.registrationDate,
      expiredDate: body.expiredDate,
      dataSummary: body.dataSummary,
    });

    logActivity(
      req.actor,
      id,
      null,
      null,
      `Uploaded ${fileName} (${docCode || body.checklistId})`,
      {actionType: 'DOCUMENT_UPLOAD', sectionName: 'Documents'},
    );

    const application = await intakeDetail(id);
    let fapComparison: any = undefined;
    if (isFapChecklist({documentCode: docCode || '', documentName: fileName})) {
      fapComparison = await compareFapDocumentOcr(id, fileKey, application).catch(() => undefined);
    }

    return res.status(201).json({file: saved, application, ...(fapComparison ? {fapComparison} : {})});
  }

  @Delete('applications/:id/documents/files/:fileId')
  async remove(
    @ApiReq() req: ApiRequest,
    @Param('id') id: string,
    @Param('fileId') fileId: string,
  ) {
    requireAuthority(req.actor, 'crm_delete_app_documents');
    const removed = await deleteApplicationDocumentFile(
      id,
      fileId,
      req.actor?.name || req.actor?.username || 'System',
    );
    if (removed?.storageKey) {
      await removeStoredDocument(removed.storageKey).catch(() => undefined);
    }
    logActivity(
      req.actor,
      id,
      null,
      null,
      `Deleted ${removed.fileName}`,
      {actionType: 'DOCUMENT_DELETE', sectionName: 'Documents'},
    );
    return intakeDetail(id);
  }

  @Get('files/:id/url')
  async signedUrl(@ApiReq() req: ApiRequest, @Param('id') id: string) {
    requireAuthority(req.actor, 'crm_view_documents', 'crm_view_applications');
    const file = await readDocumentFile(id);
    if (!file) throw new Problem(404, 'File not found.');
    if (s3 && file.storageKey) {
      const cmd = new GetObjectCommand({Bucket: process.env.S3_BUCKET, Key: file.storageKey});
      const url = await getSignedUrl(s3, cmd, {expiresIn: 900});
      return {url};
    }
    const token = signFileToken(id, req.actor.id);
    return {url: `/api/v1/files/${id}/content?token=${encodeURIComponent(token)}`};
  }

  @Public()
  @Get('files/:id/content')
  async content(@ApiReq() req: ApiRequest, @Param('id') id: string, @Res() res: ApiResponse) {
    return this.serveFile(req, id, res, 'inline');
  }

  @Public()
  @Get('files/:id/download')
  async download(@ApiReq() req: ApiRequest, @Param('id') id: string, @Res() res: ApiResponse) {
    return this.serveFile(req, id, res, 'attachment');
  }

  private async serveFile(
    req: ApiRequest,
    id: string,
    res: ApiResponse,
    disposition: 'inline' | 'attachment',
  ) {
    const token = req.query?.token || '';
    let okToken = false;
    if (token) {
      try {
        okToken = verifyFileToken(token)?.fileId === id;
      } catch {
        okToken = false;
      }
    }
    if (!okToken && !req.actor) throw new Problem(401, 'Unauthorized file access.');
    const file = await readDocumentFile(id);
    if (!file) throw new Problem(404, 'File not found.');

    const fullPath = path.join(filesDir, file.storageKey);
    const buf = await fs.readFile(fullPath).catch(() => null);
    if (!buf) throw new Problem(404, 'Stored file binary not found.');
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(file.fileName)}"`);
    return res.send(buf);
  }
}
