import {storedDocumentUrl} from '@liugong/shared';
import {Controller, Get, Param, Post} from '@nestjs/common';
import fs from 'node:fs/promises';
import {cleanNullableString} from '../../core/db/crm-lookups';
import {one} from '../../core/db/query';
import {Problem} from '../../core/domain';
import {API_PREFIX, ApiReq, type ApiRequest} from '../../core/http/api-request';
import {generateDocumentStorageInfo, mirrorFileToPrototypeSrc} from '../../core/storage';
import {dateStr} from '../applications/intake/helpers';
import {requireAuthority} from '../auth/session';
import {runOcr} from '../ocr/ocr-runner';
import {
  OCR_TABLES,
  resolveExistingStakeholderId,
  upsertIdentityRecord,
} from './identity-documents.store';

@Controller(API_PREFIX)
export class IdentityDocumentsController {
  @Post('ocr/scan')
  async scan(@ApiReq() req: ApiRequest) {
    requireAuthority(req.actor, 'crm_edit_app_legal', 'crm_edit_app_customer_pic', 'crm_upload_app_documents');
    const body = req.body || {};
    const uploaded = req.file;
    if (!uploaded) throw new Problem(422, 'Uploaded file is required for OCR scan.');

    const docType = String(body.doc_type || body.docType || 'ktp').trim().toLowerCase();
    const appId = String(body.application_id || body.applicationId || 'unknown');
    const rawStakeholderId = cleanNullableString(body.stakeholder_id || body.stakeholderId);
    const info = await generateDocumentStorageInfo(
      docType,
      appId,
      rawStakeholderId || 'unknown',
      uploaded.originalname || `${docType}.jpg`,
    );

    await fs.writeFile(info.savedFilePath, uploaded.buffer);
    await mirrorFileToPrototypeSrc(info.savedFilePath, uploaded.buffer);

    const ocrRes = await runOcr(info.savedFilePath, docType);
    const data = ocrRes?.data ?? ocrRes ?? {};
    const stakeholderId = await resolveExistingStakeholderId(rawStakeholderId);
    const actorName = String(req.actor?.name || req.actor?.username || 'System').slice(0, 150);

    let ocrRecordId: string | null = null;
    if (OCR_TABLES[docType] && data && typeof data === 'object') {
      ocrRecordId = await upsertIdentityRecord(docType, {
        stakeholderId,
        rawStakeholderId,
        documentPath: info.fileUrl,
        fileName: info.fileName,
        data,
        actorName,
      }).catch(() => null);
    }

    return {
      id: ocrRecordId,
      ocrId: ocrRecordId,
      doc_type: docType,
      data,
      fileName: info.fileName,
      fileUrl: storedDocumentUrl(info.fileUrl),
      document_path: info.fileUrl,
      storedPath: info.fileUrl,
    };
  }

  @Post('stakeholders/documents/save')
  async save(@ApiReq() req: ApiRequest) {
    requireAuthority(req.actor, 'crm_edit_app_legal', 'crm_manage_customers');
    const body = req.body || {};
    const docType = String(body.docType || body.doc_type || 'ktp').trim().toLowerCase();
    if (!OCR_TABLES[docType]) throw new Problem(422, `Unsupported document type: ${docType}`);

    const stakeholderId = await resolveExistingStakeholderId(body.stakeholderId || body.stakeholder_id);
    const actorName = String(req.actor?.name || req.actor?.username || 'System').slice(0, 150);
    const id = await upsertIdentityRecord(docType, {
      stakeholderId,
      documentPath: cleanNullableString(body.documentPath || body.document_path || body.fileUrl),
      fileName: cleanNullableString(body.fileName || body.file_name),
      data: body.data || body,
      actorName,
    });
    return {success: true, id, docType};
  }

  @Get('stakeholders/documents/:docType/:stakeholderId')
  async fetch(
    @ApiReq() req: ApiRequest,
    @Param('docType') docTypeRaw: string,
    @Param('stakeholderId') stakeholderId: string,
  ) {
    requireAuthority(req.actor, 'crm_view_applications', 'crm_edit_app_legal');
    const docType = String(docTypeRaw || '').toLowerCase();
    const table = OCR_TABLES[docType];
    if (!table) return {data: null};

    const row = await one<any>(
      `SELECT * FROM \`${table}\` WHERE stakeholder_id = ? ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 1`,
      [stakeholderId],
    );
    if (!row) return {data: null};
    const fileUrl = storedDocumentUrl(row.document_path || (row.file_name ? `/documents/${docType}/${row.file_name}` : null));
    return {
      data: {
        ...row,
        fullName: row.full_name,
        birthPlace: row.birth_place,
        birthDate: dateStr(row.birth_date) || '',
        streetAddress: row.street_address || row.address || '',
        fileUrl,
      },
    };
  }
}
