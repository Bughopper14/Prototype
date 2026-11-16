import {Controller, Get, Post, Res} from '@nestjs/common';
import {storedDocumentUrl} from '@liugong/shared';
import fs from 'node:fs/promises';
import path from 'node:path';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {StorageService} from '../../core/storage';
import {OcrWorkerService} from '../ocr/ocr-worker.service';
import {requireAuthority} from '../auth/session';
import {IDENTITY_TYPES, IdentityDocumentsRepository} from './identity-documents.repository';

/** Reading an identity document with OCR is part of filling in a company, its PIC, its deeds or its stakeholders. */
const OCR_AUTHORITIES = [
  'crm_create_application',
  'crm_edit_app_customer_pic',
  'crm_edit_app_legal',
  'crm_edit_app_stakeholders',
  'crm_manage_customers',
];

/** Stakeholder identity documents (KTP, NPWP, passport, KITAS): OCR scan, save and lookup. */
@Controller(API_PREFIX)
export class IdentityDocumentsController {
  constructor(
    private readonly identities: IdentityDocumentsRepository,
    private readonly storage: StorageService,
    private readonly worker: OcrWorkerService,
  ) {}

  @Post('ocr/scan')
  async scan(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, ...OCR_AUTHORITIES);
    const file = req.file;
    if (!file) {
      res.status(400);
      return {error: 'File tidak ditemukan'};
    }
    const docType = String(req.body.doc_type || 'auto').toLowerCase();
    const stakeholderId = String(req.body.stakeholder_id || '').trim();
    const appId = String(req.body.application_id || req.body.app_id || 'APP').trim();

    const storage = await this.storage.identityDocumentTarget(
      docType === 'auto' ? 'ktp' : docType,
      appId,
      stakeholderId,
      file.originalname,
    );
    await fs.writeFile(storage.savedFilePath, file.buffer);

    let result;
    try {
      result = await this.worker.run(storage.savedFilePath, docType);
    } catch (err: any) {
      res.status(500);
      return {error: 'OCR processing error: ' + (err.message || String(err))};
    }
    if (result.type_mismatch) {
      // Wrong tab (e.g. a KITAS on the passport tab): drop the stored file and keep the data out of the tables
      await fs.unlink(storage.savedFilePath).catch(() => undefined);
      const found = String(result.type_mismatch).toUpperCase() === 'KITAS' ? 'KITAS' : 'passport';
      const expected = docType === 'kitas' ? 'KITAS' : 'passport';
      const otherTab = found === 'KITAS' ? 'KITAS' : 'Passport';
      res.status(422);
      return {
        error: `This looks like a ${found}, not a ${expected}. Please upload it in the ${otherTab} tab.`,
        code: 'WRONG_DOCUMENT_TYPE',
      };
    }
    const detectedType = String(result.doc_type || storage.docType).toLowerCase();
    Object.assign(result, {
      fileName: storage.fileName,
      file_name: storage.fileName,
      filePath: storage.relativePath,
      document_path: storage.relativePath,
      fileUrl: storage.fileUrl,
    });
    // Stored right away for a saved stakeholder; for a new one the form saves it with "documents/save" later.
    if (
      stakeholderId &&
      result.data &&
      IDENTITY_TYPES.includes(detectedType) &&
      (await this.identities.stakeholderExists(stakeholderId))
    )
      await this.identities.save(
        detectedType,
        stakeholderId,
        result.data,
        {fileName: storage.fileName, documentPath: storage.relativePath},
        req.actor.username || null,
      );
    return result;
  }

  @Post('stakeholders/documents/save')
  async save(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_edit_app_stakeholders', 'crm_edit_app_legal');
    const {stakeholder_id, doc_type, data} = req.body || {};
    if (!stakeholder_id) {
      res.status(400);
      return {error: 'stakeholder_id wajib diisi'};
    }
    const type = String(doc_type || 'ktp').toLowerCase();
    if (!IDENTITY_TYPES.includes(type)) {
      res.status(404);
      return {error: 'Invalid doc type'};
    }
    if (!(await this.identities.stakeholderExists(String(stakeholder_id)))) {
      res.status(409);
      return {error: 'Simpan stakeholder terlebih dahulu.'};
    }
    const fileName = data?.file_name || data?.fileName || null;
    const documentPath =
      data?.document_path || data?.filePath || (fileName ? `Documents/${type}/${fileName}` : null);
    await this.identities.save(type, String(stakeholder_id), data || {}, {fileName, documentPath}, req.actor.username || null);
    return {status: 'saved', stakeholder_id, doc_type: type, file_name: fileName, document_path: documentPath};
  }

  @Get('stakeholders/documents/:docType/:stakeholderId')
  async find(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_view_app_stakeholders', 'crm_view_app_legal', 'crm_edit_app_stakeholders');
    const type = req.params.docType.toLowerCase();
    if (!IDENTITY_TYPES.includes(type)) {
      res.status(404);
      return {error: 'Invalid doc type'};
    }
    const row: any = await this.identities.find(type, req.params.stakeholderId);
    if (!row) {
      res.status(404);
      return {status: 'not_found', data: null};
    }
    const fileName = row.file_name || (row.document_path ? path.basename(row.document_path) : null);
    const fileUrl = storedDocumentUrl(row.document_path) || (fileName ? `/documents/${type}/${fileName}` : null);
    return {
      status: 'success',
      data: {...row, file_name: fileName, fileName, fileUrl, filePath: row.document_path, document_path: row.document_path},
    };
  }
}
