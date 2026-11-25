import {Controller, Delete, Get, Post, Res} from '@nestjs/common';
import {strToU8, zipSync} from 'fflate';
import crypto from 'node:crypto';
import path from 'node:path';
import {CrmDatabase} from '../../core/db/crm-database';
import {Problem, ensure} from '../../core/domain';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {StorageService, documentExtension} from '../../core/storage';
import {recordActivity} from '../activity/activity-log';
import {ApplicationsService} from '../applications/applications.service';
import {requireAuthority, signFileToken, verifyFileToken} from '../auth/session';
import {FapComparisonService} from '../fap/fap-comparison.service';
import {DocumentsRepository, FAP_DOCUMENT_CODE} from './documents.repository';

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
  constructor(
    private readonly db: CrmDatabase,
    private readonly applications: ApplicationsService,
    private readonly documents: DocumentsRepository,
    private readonly comparisons: FapComparisonService,
    private readonly storage: StorageService,
  ) {}

  /** Documents are locked once the application is in the last workflow stage (committee and decision). */
  private async unlocked(id: string, actor: any) {
    const current = await this.applications.detailOr404(id, actor);
    const isAdmin = actor.isAdmin || actor.role === 'ADMIN';
    ensure(isAdmin || !current.workflowFlags?.lastStage, 'Documents are locked at this stage', 409);
    return current;
  }

  @Get('document-desk')
  documentDesk(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_DOCUMENT-DESK_VIEW');
    return this.documents.desk();
  }

  @Post('applications/:id/documents/upload')
  async upload(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(
      req.actor,
      'CRM_DOCUMENT_UPLOAD',
      'CRM_CUSTOMER-PIC_EDIT',
      'CRM_LEGAL_EDIT',
      'CRM_STAKEHOLDER_EDIT',
      'CRM_APPLICATION_CREATE',
      'CRM_APPLICATION_EDIT',
    );
    const id = req.params.id;
    const file = req.file;
    ensure(file, 'Choose a file');
    assertValidUpload(file);
    const current = await this.unlocked(id, req.actor);
    const subType = String(req.body.subType || req.body.sub_type || '').trim().toUpperCase();
    const row = await this.documents.checklistRow(this.db.pool, id, String(req.body.checklistId || req.body.documentCode || ''));
    const checklistCode = (row?.code || String(req.body.documentCode || req.body.checklistId || '')).toUpperCase();

    let jenisDoc = subType;
    if (!jenisDoc) {
      if (checklistCode === 'NPWP') {
        jenisDoc = 'NPWPUSAHA';
      } else if (checklistCode === 'NIB') {
        jenisDoc = 'NIB';
      } else {
        jenisDoc = checklistCode.replace(/[^A-Z0-9_]/g, '') || 'DOC';
      }
    }

    let appNumber = current.applicationNumber || current.application_number;
    if (!appNumber) {
      const [appRows] = await this.db.pool.execute<any[]>(
        'SELECT application_number FROM crm_applications WHERE id = ? LIMIT 1',
        [id],
      );
      appNumber = appRows[0]?.application_number || id;
    }

    // ONE copy, under the folder of the application, named <JENIS>_<application number>_<NNN>; the name the user uploaded is kept in the database only, never shown.
    const stored = await this.storage.saveDocument(appNumber, jenisDoc, documentExtension(file.originalname, file.mimetype), file.buffer);
    const fileName = stored.fileName;
    const storagePath = stored.key;
    const by = req.actor.username || req.actor.name;
    const saved = await this.db.transaction(conn =>
      this.documents.addFile(
        conn,
        id,
        String(req.body.checklistId || req.body.documentCode || ''),
        {fileName, originalFileName: String(file.originalname || '').slice(0, 255) || null, storagePath, size: file.size, mimeType: file.mimetype},
        by,
      ),
    );
    await recordActivity(
      {
        applicationId: id,
        stageCode: current.workflowStage?.code,
        section: 'Documents',
        tabIndex: 6,
        actionType: 'UPDATE',
        title: `Document uploaded: ${fileName}`,
        details: `${saved.documentCode} · ${file.mimetype} · ${file.size} bytes`,
        previousStatus: current.status,
        newStatus: current.status,
      },
      req.actor,
    );

    let fapComparison: unknown = null;
    if (saved.documentCode === FAP_DOCUMENT_CODE) {
      // Give the OCR comparison a few seconds, otherwise let it finish in the background.
      fapComparison = await Promise.race([
        this.comparisons.run(id, req.actor),
        new Promise(resolve => setTimeout(() => resolve({isFap: true, status: 'processing', diffs: []}), 6000)),
      ]).catch(() => ({isFap: true, status: 'processing', diffs: []}));
    }
    res.status(201);
    return {
      id: saved.id,
      checklistId: saved.checklistId,
      fileName,
      storagePath,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedBy: by,
      fapComparison,
    };
  }

  @Delete('applications/:id/documents/files/:fileId')
  async deleteFile(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_DOCUMENT_DELETE');
    const {id, fileId} = req.params;
    const current = await this.unlocked(id, req.actor);
    const removed = await this.documents.readFile(fileId);
    // the file moves while the delete is being saved: when the save fails it goes back, so its row never points at nothing
    const moved: {from: string; to: string}[] = [];
    try {
      await this.db.transaction(async conn => {
        await this.documents.deleteFile(conn, id, fileId, req.actor.username || null, async from => {
          const to = await this.storage.moveToBin(from);
          moved.push({from, to});
          return to;
        });
      });
    } catch (e) {
      for (const m of moved) await this.storage.moveBack(m.to, m.from).catch(err => console.error(`Could not move ${m.to} back to ${m.from}:`, err));
      throw e;
    }
    await this.comparisons.forget(fileId);
    await recordActivity(
      {
        applicationId: id,
        stageCode: current.workflowStage?.code,
        section: 'Documents',
        tabIndex: 6,
        actionType: 'UPDATE',
        title: `Document file deleted: ${removed?.fileName ?? fileId}`,
        previousStatus: current.status,
        newStatus: current.status,
      },
      req.actor,
    );
    return this.applications.detail(id, req.actor);
  }

  /**
   * All files of the Document Checklist as one ZIP, in a folder per workflow stage (`<stage>/<CODE>_<file name>`).
   * Documents linked from other sections without an uploaded file have nothing to put in it. Files already compressed
   * (PDF, images) are stored as they are.
   */
  @Get('applications/:id/documents/zip')
  async zip(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_DOCUMENT_VIEW');
    const id = req.params.id;
    const application = await this.applications.detailOr404(id, req.actor);
    const entries = await this.documents.filesForZip(id);
    ensure(entries.length, 'Belum ada berkas di Document Checklist untuk diunduh.', 404);

    const safe = (s: string) => s.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim() || '_';
    const used = new Set<string>();
    const files: Record<string, Uint8Array> = {};
    const unreadable: string[] = [];
    for (const e of entries) {
      let data: Buffer;
      try {
        data = await this.storage.read(e.storagePath);
      } catch {
        unreadable.push(`${e.code} ${e.fileName}`);
        continue;
      }
      const folder = safe(e.stageName || 'Lainnya');
      // Uploaded names usually start with the document code already; do not repeat it.
      const base = safe(e.fileName);
      const prefix = base.toUpperCase().startsWith(`${e.code.toUpperCase()}_`) ? '' : `${safe(e.code)}_`;
      let name = `${folder}/${prefix}${base}`;
      for (let n = 2; used.has(name.toLowerCase()); n++) name = `${folder}/${prefix}v${n}_${base}`;
      used.add(name.toLowerCase());
      files[name] = new Uint8Array(data);
    }
    ensure(Object.keys(files).length, 'Berkas tidak dapat dibaca dari penyimpanan.', 500);
    if (unreadable.length)
      files['CATATAN.txt'] = strToU8(
        `Berkas berikut tidak dapat dibaca dari penyimpanan dan tidak ikut diunduh:\n${unreadable.join('\n')}\n`,
      );

    const zip = Buffer.from(zipSync(files, {level: 0}));
    const label = safe(String(application.customer?.companyName || application.companyName || id)).replace(/\s+/g, '_');
    res
      .setHeader('Content-Type', 'application/zip')
      .setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(`Dokumen_${label}.zip`)}`);
    return res.send(zip);
  }

  /** A short-lived link to a file: inline for the preview, or `?download=1` to save it. */
  @Get('files/:id/url')
  async fileUrl(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(
      req.actor,
      'CRM_DOCUMENT_VIEW',
      'CRM_DOCUMENT-DESK_VIEW',
      'CRM_LEGAL_EDIT',
    );
    const file = await this.documents.readFile(req.params.id);
    ensure(file, 'File not found', 404);
    const download = req.query.download === '1';
    const url = `/api/v1/files/${file.id}/content?token=${signFileToken(file.id, req.actor.id)}${download ? '&download=1' : ''}`;
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
    const file = await this.documents.readFile(req.params.id);
    ensure(file, 'File not found', 404);
    res
      .setHeader('Content-Type', file.mimeType)
      .setHeader(
        'Content-Disposition',
        `${req.query.download === '1' ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      );
    return res.send(await this.storage.read(file.storagePath));
  }
}
