import {Controller, Get, Post, Res} from '@nestjs/common';
import {storedDocumentUrl} from '@liugong/shared';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {CrmDatabase} from '../../core/db/crm-database';
import {StorageService, buildDocumentFileName} from '../../core/storage';
import {DocumentsRepository} from '../documents/documents.repository';
import {OcrWorkerService} from '../ocr/ocr-worker.service';
import {requireAuthority} from '../auth/session';
import {IDENTITY_TYPES, IdentityDocumentsRepository} from './identity-documents.repository';

/** Reading an identity document with OCR is part of filling in a company, its PIC, its deeds or its stakeholders. */
const OCR_AUTHORITIES = [
  'CRM_APPLICATION_CREATE',
  'CRM_CUSTOMER-PIC_EDIT',
  'CRM_LEGAL_EDIT',
  'CRM_STAKEHOLDER_EDIT',
  'CRM_CUSTOMER_MANAGE',
];

/** The checklist document a scan also belongs to: the scanned NIB is the NIB document, a KTP the KTP document, a passport or KITAS the E-KITAS document, and NPWP the NPWP document. */
const CHECKLIST_DOCUMENT: Record<string, string> = {nib: 'NIB', ktp: 'KTP', passport: 'EKITAS', kitas: 'EKITAS', npwp: 'NPWP'};

/** Stakeholder identity documents (KTP, NPWP, passport, KITAS): OCR scan, save and lookup. */
@Controller(API_PREFIX)
export class IdentityDocumentsController {
  constructor(
    private readonly identities: IdentityDocumentsRepository,
    private readonly storage: StorageService,
    private readonly worker: OcrWorkerService,
    private readonly db: CrmDatabase,
    private readonly documents: DocumentsRepository,
  ) {}

  /**
   * A scanned document is also a file of the application's document checklist (NIB, KTP, E-KITAS), so it shows there and can be sent for approval
   * without being uploaded a second time. Nothing happens when the scan does not belong to a saved application or the checklist has no such document.
   */
  private async addToChecklist(applicationId: string, docType: string, file: {buffer: Buffer; mimetype: string; size: number}, fileName: string, by: string) {
    const code = CHECKLIST_DOCUMENT[docType];
    if (!code || !applicationId) return;
    try {
      const storageKey = crypto.randomUUID();
      await this.db.transaction(async conn => {
        if (!(await this.documents.checklistRow(conn, applicationId, code))) return;
        await this.storage.put(storageKey, file.buffer, file.mimetype);
        await this.storage.saveNamedCopy(fileName, file.buffer).catch(() => undefined);
        await this.documents.addFile(conn, applicationId, code, {fileName, storageKey, storagePath: this.storage.usesS3 ? null : fileName, size: file.size, mimeType: file.mimetype}, by);
      });
    } catch (err) {
      console.warn('The scan could not be added to the document checklist:', err);
    }
  }

  @Post('ocr/scan')
  async scan(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, ...OCR_AUTHORITIES);
    const file = req.file;
    if (!file) {
      res.status(400);
      return {error: 'File tidak ditemukan'};
    }
    const docType = String(req.body.doc_type || 'auto').toLowerCase();
    const subType = String(req.body.sub_type || req.body.context || req.body.subType || '').trim().toUpperCase();
    const stakeholderId = String(req.body.stakeholder_id || '').trim();
    const appId = String(req.body.application_id || req.body.app_id || 'APP').trim();

    let jenisDoc = subType;
    if (!jenisDoc) {
      if (docType === 'nib') {
        jenisDoc = 'NIB';
      } else if (docType === 'npwp') {
        jenisDoc = stakeholderId ? 'NPWPSTAKEHOLDER' : 'NPWPUSAHA';
      } else if (docType === 'ktp') {
        jenisDoc = stakeholderId ? 'KTPSTAKEHOLDER' : 'KTPPENGURUS';
      } else if (docType === 'passport') {
        jenisDoc = 'PASSPORT';
      } else if (docType === 'kitas') {
        jenisDoc = 'KITAS';
      } else {
        jenisDoc = docType.toUpperCase();
      }
    }

    let appNumber = 'APP';
    if (appId && appId !== 'APP' && appId !== 'unknown') {
      const [appRows] = await this.db.pool.execute<any[]>(
        'SELECT application_number FROM crm_applications WHERE id = ? LIMIT 1',
        [appId],
      );
      appNumber = appRows[0]?.application_number || appId;
    }

    const customFileName = buildDocumentFileName(jenisDoc, appNumber, file.originalname);

    const storage = await this.storage.identityDocumentTarget(
      docType === 'auto' ? 'ktp' : docType,
      appId,
      stakeholderId,
      file.originalname,
      customFileName,
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
    await this.addToChecklist(appId, detectedType, file, storage.fileName, req.actor.username || req.actor.name || 'system');
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
    requireAuthority(req.actor, 'CRM_STAKEHOLDER_EDIT', 'CRM_LEGAL_EDIT');
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
    requireAuthority(req.actor, 'CRM_STAKEHOLDER_VIEW', 'CRM_LEGAL_VIEW', 'CRM_STAKEHOLDER_EDIT');
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
