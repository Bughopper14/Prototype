import {GetObjectCommand} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import {Controller, Delete, Get, Post, Res} from '@nestjs/common';
import fs from 'node:fs/promises';
import path from 'node:path';
import {many} from '../../core/db/query';
import {Problem, ensure} from '../../core/domain';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {documentsDir, filesDir, putStoredFile, removeStoredDocument, s3} from '../../core/storage';
import {logActivity} from '../activity/activity-log';
import {intakeDetail} from '../applications/intake.repository';
import {requireAuthority, signFileToken, verifyFileToken} from '../auth/session';
import {
  deleteApplicationDocumentFile,
  readApplicationDocuments,
  readDocumentFile,
  saveFapComparison,
  uploadApplicationDocument,
} from './documents.repository';
import {compareFapDocumentOcr, isFapChecklist} from '../fap/fap-comparison';


const IMAGE_SIGNATURES = {
  png: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
};

function assertValidUpload(file: {buffer: Buffer; mimetype: string}) {
  const head = file.buffer.subarray(0, 8);
  const valid =
    (file.mimetype === 'application/pdf' && head.subarray(0, 5).toString() === '%PDF-') ||
    (file.mimetype === 'image/png' && head.equals(IMAGE_SIGNATURES.png)) ||
    (file.mimetype === 'image/jpeg' && head[0] === 255 && head[1] === 216 && head[2] === 255);
  ensure(valid, 'Upload a valid PDF, PNG or JPEG file');
}

/** `<name>_<APPHASH>_<yyyymmdd_hhmm>.<ext>`: keeps the original name but makes every upload unique and traceable. */
function formattedUploadName(applicationId: string, originalname: string, mimetype: string) {
  const ext = path.extname(originalname) || (mimetype === 'application/pdf' ? '.pdf' : '.png');
  const base = path.basename(originalname, ext).replace(/_[A-Z0-9]{6}_\d{8}_\d{4}$/i, '');
  const hash = applicationId
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 6)
    .toUpperCase();
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${base}_${hash}_${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}${ext}`;
}

@Controller(API_PREFIX)
export class DocumentsController {
  @Get('document-desk')
  documentDesk(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    return many(`
  SELECT d.id AS checklist_id, d.application_id, d.document_code, d.document_name, d.assigned_role, d.is_mandatory, d.status,
         f.fap_registration_number AS fap_number, f.company_name,
         (SELECT COUNT(*) FROM application_document_file x WHERE x.checklist_id = d.id) AS file_count
  FROM application_document_checklist d
  JOIN all_applications a ON a.application_id = d.application_id
  JOIN new_application_fap_stage f ON f.id_fap_stage = a.id_fap_stage
  ORDER BY CASE d.status WHEN 'REJECTED' THEN 0 WHEN 'PENDING' THEN 1 WHEN 'UPLOADED' THEN 2 ELSE 3 END,
           a.created_at DESC, d.document_name`);
  }

  @Post('applications/:id/documents/upload')
  async upload(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_upload_app_documents');
    const id = req.params.id;
    const file = req.file;
    ensure(file, 'Choose a file');
    assertValidUpload(file);
    const current = await intakeDetail(id);
    ensure(current, 'Application not found', 404);

    const fileName = formattedUploadName(id, file.originalname, file.mimetype);
    const result = await uploadApplicationDocument(
      id,
      String(req.body.checklistId),
      {...file, originalname: fileName},
      req.actor.id,
      async key => {
        await putStoredFile(key, file.buffer, file.mimetype);
        if (!s3) {
          await fs.mkdir(documentsDir, {recursive: true});
          await fs.writeFile(path.join(documentsDir, fileName), file.buffer).catch(() => {});
        }
      },
    );
    await logActivity(req.actor, id, current.status, current.status, `Document uploaded: ${fileName}`);

    let fapComparison: unknown = null;
    if (
      String(req.body.checklistId || '')
        .toUpperCase()
        .includes('FAP') ||
      String(req.body.documentCode || '').toUpperCase() === 'FAP'
    ) {
      // Give the OCR comparison a few seconds, otherwise let it finish in the background.
      fapComparison = await Promise.race([
        compareFapDocumentOcr(id, fileName, current),
        new Promise(resolve =>
          setTimeout(() => resolve({isFap: true, status: 'processing', diffs: []}), 6000),
        ),
      ]).catch(() => ({isFap: true, status: 'processing', diffs: []}));
    }
    res.status(201);
    return {...result, fileName, fapComparison};
  }

  @Delete(['applications/:id/documents/files/:fileId', 'applications/:id/documents/:fileId'])
  async deleteFile(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_delete_app_documents');
    const {id, fileId} = req.params;
    const current = await intakeDetail(id);
    ensure(current, 'Application not found', 404);
    await deleteApplicationDocumentFile(id, fileId, removeStoredDocument);
    const fap = (await readApplicationDocuments(id)).find(isFapChecklist);
    if (!fap?.files?.length) await saveFapComparison(id, null);
    await logActivity(req.actor, id, current.status, current.status, 'Document file deleted');
    return intakeDetail(id);
  }

  @Get('files/:id/url')
  async fileUrl(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const file = await readDocumentFile(req.params.id);
    ensure(file, 'File not found', 404);
    const url = s3
      ? await getSignedUrl(
          s3,
          new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: file.fileKey,
            ResponseContentDisposition: 'inline',
          }),
          {expiresIn: 900},
        )
      : `/api/v1/files/${file.id}/content?token=${signFileToken(file.id, req.actor.id)}`;
    return {url, expiresIn: 900};
  }

  @Get('files/:id/content')
  async fileContent(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    let token;
    try {
      token = verifyFileToken(String(req.query.token));
    } catch {
      throw new Problem(403, 'Document link has expired');
    }
    ensure(token.fileId === req.params.id && token.userId === req.actor.id, 'Invalid document link', 403);
    const file = await readDocumentFile(req.params.id);
    ensure(file, 'File not found', 404);
    res
      .setHeader('Content-Type', file.mimeType)
      .setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
    return res.send(await fs.readFile(path.join(filesDir, file.fileKey)));
  }
}
