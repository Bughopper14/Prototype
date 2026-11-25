import {Controller, Get, Post, Res} from '@nestjs/common';
import fs from 'node:fs/promises';
import path from 'node:path';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {CrmDatabase} from '../../core/db/crm-database';
import {CRM} from '../../core/db/crm-tables';
import {ensure} from '../../core/domain';
import {StorageService, documentExtension} from '../../core/storage';
import {DocumentsRepository} from '../documents/documents.repository';
import {OcrBusyError, OcrWorkerService} from '../ocr/ocr-worker.service';
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

/**
 * The checklist documents a scan can be filed under, the first one the application has wins. KTP and passport are the primary identity of a stakeholder,
 * NPWP and E-KITAS the second one; the NPWP of the company is its own document, and also takes a stakeholder NPWP when the checklist has no second one.
 */
const checklistCodes = (docType: string, ofStakeholder: boolean): string[] =>
  (({
    nib: ['NIB'],
    ktp: ['KTP-PASSPORT'],
    passport: ['KTP-PASSPORT'],
    npwp: ofStakeholder ? ['NPWP-EKITAS', 'NPWP'] : ['NPWP'],
    kitas: ['NPWP-EKITAS'],
  }) as Record<string, string[]>)[docType] ?? [];

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
   * A scanned document is also a file of the application's document checklist, so it shows there and can be sent for approval without being uploaded a
   * second time. It is the same stored file (one copy), recorded with the stakeholder it belongs to. When the application's checklist does not have
   * that document yet, an override (ADD) with a reason is created automatically so the file is recorded in the database and visible on the checklist.
   */
  private async addToChecklist(
    applicationId: string,
    docType: string,
    stored: {key: string; fileName: string},
    file: {originalname?: string; mimetype: string; size: number},
    by: string,
    stakeholderId: string | null,
    userId: number | null = null,
  ) {
    try {
      await this.db.transaction(async conn => {
        const codes = checklistCodes(docType, !!stakeholderId);
        const fileInput = {
          fileName: stored.fileName,
          originalFileName: String(file.originalname || '').slice(0, 255) || null,
          storagePath: stored.key,
          size: file.size,
          mimeType: file.mimetype,
          stakeholderId,
        };
        for (const code of codes) {
          if (!(await this.documents.checklistRow(conn, applicationId, code))) continue;
          await this.documents.addFile(conn, applicationId, code, fileInput, by);
          return;
        }
        const targetCode = codes[0];
        if (!targetCode) {
          console.warn(`No checklist document code mapped for a ${docType} scan; ${stored.key} is not recorded.`);
          return;
        }
        const [[app]] = await conn.execute<any[]>(
          `SELECT workflow_freeze_id FROM ${CRM.applications} WHERE id=? AND deleted_at IS NULL LIMIT 1`,
          [applicationId],
        );
        if (!app?.workflow_freeze_id) return;
        const [[stage]] = await conn.execute<any[]>(
          // the first stage in the order the workflow shows them (the numbers start at 1 again in every group)
          `SELECT s.code, s.department_code FROM ${CRM.frozenWorkflowStages} s
           JOIN ${CRM.frozenWorkflowStageGroups} g ON g.workflow_freeze_id=s.workflow_freeze_id AND g.code=s.group_code
           WHERE s.workflow_freeze_id=? ORDER BY g.sort_order,g.name,s.sort_order,s.name LIMIT 1`,
          [app.workflow_freeze_id],
        );
        if (!stage?.code) return;

        const reason = `Auto-added from ${docType.toUpperCase()} OCR scan`;
        const departmentCode = stage.department_code || 'MKT';
        const [[sd]] = await conn.execute<any[]>(
          `SELECT is_default FROM ${CRM.frozenWorkflowStageDocuments} WHERE workflow_freeze_id=? AND stage_code=? AND document_code=? LIMIT 1`,
          [app.workflow_freeze_id, stage.code, targetCode],
        );

        let checklistKey = targetCode;
        if (sd && Number(sd.is_default) === 1) {
          const [[removed]] = await conn.execute<any[]>(
            `SELECT id FROM ${CRM.applicationDocumentOverrides} WHERE application_id=? AND stage_code=? AND document_code=? AND action='REMOVE' AND is_active=1 LIMIT 1`,
            [applicationId, stage.code, targetCode],
          );
          if (removed?.id) {
            await this.documents.cancelOverride(conn, applicationId, app.workflow_freeze_id, removed.id, by);
          } else {
            await this.documents.seedChecklist(conn, applicationId, app.workflow_freeze_id, by);
          }
        } else if (sd) {
          await this.documents.addOverride(conn, {
            applicationId,
            workflowFreezeId: app.workflow_freeze_id,
            stageCode: stage.code,
            action: 'ADD',
            workflowDocumentCode: targetCode,
            departmentCode,
            isMandatory: false,
            reason,
            userId,
            userName: by,
          });
        } else {
          const [[master]] = await conn.execute<any[]>(
            `SELECT id FROM ${CRM.masterDocumentTypes} WHERE code=? LIMIT 1`,
            [targetCode],
          );
          const overrideId = await this.documents.addOverride(conn, {
            applicationId,
            workflowFreezeId: app.workflow_freeze_id,
            stageCode: stage.code,
            action: 'ADD',
            documentCode: master ? targetCode : null,
            customName: master ? null : targetCode,
            departmentCode,
            isMandatory: false,
            reason,
            userId,
            userName: by,
          });
          if (!master) {
            const [[created]] = await conn.execute<any[]>(
              `SELECT id FROM ${CRM.applicationDocumentChecklists} WHERE application_id=? AND override_id=? LIMIT 1`,
              [applicationId, overrideId],
            );
            if (created?.id) checklistKey = created.id;
          }
        }
        await this.documents.addFile(conn, applicationId, checklistKey, fileInput, by);
      });
    } catch (err) {
      console.warn('The scan could not be added to the document checklist:', err);
    }
  }

  /**
   * Files a scan that is being used (the form it belongs to was saved or applied): the file is copied from the temp folder to the documents of its
   * application and added to the checklist. The scan stays in temp. Doing it again for the same scan gives the same result and does not copy twice.
   */
  private async keepScan(tempKey: string, docType: string, by: string, stakeholderId: string | null = null, userId: number | null = null) {
    const abs = this.storage.tempAbsolute(tempKey);
    const exists = abs ? await fs.stat(abs).then(i => i.isFile(), () => false) : false;
    ensure(abs && exists, 'The scanned file was not found. Scan it again.', 404);
    // One small file beside the scan: the name the user uploaded and, once the scan is filed, where it went.
    const sidecar = `${abs}.kept`;
    const info: {originalName?: string; fileName?: string; documentPath?: string; fileUrl?: string} = await fs.readFile(sidecar, 'utf8').then(
      text => JSON.parse(text),
      (err: any) => {
        if (err?.code === 'ENOENT') return {};
        throw err;
      },
    );
    if (info.documentPath) {
      if (stakeholderId) await this.identities.setOwner(info.documentPath.replace('documents/', ''), stakeholderId);
      return {fileName: info.fileName!, documentPath: info.documentPath, fileUrl: info.fileUrl!};
    }
    const name = path.basename(abs!);
    const folder = path.basename(path.dirname(abs!));
    const [apps] = await this.db.pool.execute<any[]>('SELECT id FROM crm_applications WHERE application_number = ? AND deleted_at IS NULL LIMIT 1', [folder]);
    ensure(apps[0], 'Application not found', 404);
    const named = new RegExp(`^(.+?)_${folder}_(\\d{3})_T\\d+(\\.[^.]+)$`).exec(name);
    ensure(named, 'This is not a scanned file', 422);
    const body = await fs.readFile(abs!);
    const stored = await this.storage.saveDocument(folder, named![1], named![3], body, Number(named![2]));
    const mime: Record<string, string> = {'.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp'};
    await this.addToChecklist(
      apps[0].id,
      docType.toLowerCase(),
      stored,
      {originalname: info.originalName, mimetype: mime[named![3].toLowerCase()] || 'application/octet-stream', size: body.length},
      by,
      stakeholderId,
      userId,
    );
    const out = {fileName: stored.fileName, documentPath: `documents/${stored.key}`, fileUrl: `/documents/${stored.key}`};
    await fs.writeFile(sidecar, JSON.stringify({...info, ...out}));
    return out;
  }

  /** A scan was used (for example the NIB or NPWP of the company was applied to the form): it is filed under the application now. */
  @Post('ocr/keep')
  async keep(@ApiReq() req: ApiRequest) {
    requireAuthority(req.actor, ...OCR_AUTHORITIES);
    const tempKey = String(req.body?.temp_key || '').trim();
    ensure(tempKey, 'temp_key is required', 400);
    const kept = await this.keepScan(
      tempKey,
      String(req.body?.doc_type || ''),
      req.actor.username || req.actor.name || 'system',
      null,
      Number.isInteger(req.actor.portalUserId) ? req.actor.portalUserId : null,
    );
    return {file_name: kept.fileName, document_path: kept.documentPath, fileUrl: kept.fileUrl};
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
        jenisDoc = 'KTP';
      } else if (docType === 'passport') {
        jenisDoc = 'PASSPORT';
      } else if (docType === 'kitas') {
        jenisDoc = 'KITAS';
      } else {
        jenisDoc = docType.toUpperCase();
      }
    }

    // A scan belongs to a saved application when its id is one; only then is the file kept (under the folder of the application).
    let appNumber = 'APP';
    let savedApplication = false;
    if (appId && appId !== 'APP' && appId !== 'unknown') {
      const [appRows] = await this.db.pool.execute<any[]>(
        'SELECT application_number FROM crm_applications WHERE id = ? LIMIT 1',
        [appId],
      );
      savedApplication = !!appRows[0];
      appNumber = appRows[0]?.application_number || appId;
    }

    // A scan of a saved application is written to the temp folder first (<JENIS>_<application number>_<NNN>_T<NN>, never deleted automatically) and OCR reads
    // that file. Without an application there is nothing to file it under: OCR reads it from memory and nothing is kept.
    const ext = documentExtension(file.originalname, file.mimetype);
    let result;
    let tempKey: string | null = null;
    try {
      if (savedApplication) {
        const temp = await this.storage.saveTemp(appNumber, jenisDoc, ext, file.buffer);
        tempKey = temp.key;
        // what ocr/keep needs later: the name the user uploaded (the file itself only has the renamed one)
        await fs.writeFile(`${temp.absolutePath}.kept`, JSON.stringify({originalName: String(file.originalname || '').slice(0, 255)})).catch(() => undefined);
        result = await this.worker.run(temp.absolutePath, docType);
      } else {
        result = await this.worker.runBuffer(file.originalname || 'scan', file.buffer, docType);
      }
    } catch (err: any) {
      if (err instanceof OcrBusyError) {
        res.status(503);
        return {error: 'Pemindaian sedang penuh, coba lagi sebentar lagi.', code: 'OCR_BUSY'};
      }
      res.status(500);
      // the reader names the file it failed on with its full path: the user only gets the file name, never where the server keeps it
      return {error: 'OCR processing error: ' + String(err.message || err).replace(/'[^']*[\\/]+([^'\\/]+)'/g, "'$1'")};
    }
    if (result.type_mismatch) {
      // Wrong tab (e.g. a KITAS on the passport tab): it is not filed under the application and the data stays out of the tables
      const found = String(result.type_mismatch).toUpperCase() === 'KITAS' ? 'KITAS' : 'passport';
      const expected = docType === 'kitas' ? 'KITAS' : 'passport';
      const otherTab = found === 'KITAS' ? 'KITAS' : 'Passport';
      res.status(422);
      return {
        error: `This looks like a ${found}, not a ${expected}. Please upload it in the ${otherTab} tab.`,
        code: 'WRONG_DOCUMENT_TYPE',
      };
    }
    const detectedType = String(result.doc_type || docType).toLowerCase();
    // The scan stays in the temp folder. It is filed under the application (documents + checklist) when it is used: ocr/keep, or saving the stakeholder.
    Object.assign(result, {fileName: null, file_name: null, filePath: null, document_path: null, fileUrl: null, temp_key: tempKey});
    return result;
  }

  /** The stakeholder was saved: the scan made in its form is filed under the application now, recorded as this stakeholder's document. */
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
    const appNumber = await this.identities.applicationNumberOf(String(stakeholder_id));
    if (!appNumber) {
      res.status(409);
      return {error: 'Simpan stakeholder terlebih dahulu.'};
    }
    const tempKey = String(data?.temp_key || '');
    if (!tempKey) return {status: 'unchanged', stakeholder_id, doc_type: type, file_name: null, document_path: null};
    // a scan can only be filed for a stakeholder of the application it was made in
    ensure(tempKey.split('/')[0] === appNumber, 'This scan belongs to another application', 422);
    const kept = await this.keepScan(
      tempKey,
      type,
      req.actor.username || req.actor.name || 'system',
      String(stakeholder_id),
      Number.isInteger(req.actor.portalUserId) ? req.actor.portalUserId : null,
    );
    return {status: 'saved', stakeholder_id, doc_type: type, file_name: kept.fileName, document_path: kept.documentPath};
  }

  @Get('stakeholders/documents/:docType/:stakeholderId')
  async find(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_STAKEHOLDER_VIEW', 'CRM_LEGAL_VIEW', 'CRM_STAKEHOLDER_EDIT');
    const type = req.params.docType.toLowerCase();
    if (!IDENTITY_TYPES.includes(type)) {
      res.status(404);
      return {error: 'Invalid doc type'};
    }
    const file = await this.identities.latestFile(req.params.stakeholderId, type);
    if (!file) {
      res.status(404);
      return {status: 'not_found', data: null};
    }
    const documentPath = `documents/${file.storagePath}`;
    return {status: 'success', data: {file_name: file.fileName, fileName: file.fileName, fileUrl: `/documents/${file.storagePath}`, filePath: documentPath, document_path: documentPath}};
  }
}
