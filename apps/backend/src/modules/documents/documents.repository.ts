import crypto from 'node:crypto';
import {Injectable} from '@nestjs/common';
import type {PoolConnection} from 'mysql2/promise';
import {CrmDatabase} from '../../core/db/crm-database';
import {CRM} from '../../core/db/crm-tables';
import {ensure} from '../../core/domain';

type Conn = Pick<PoolConnection, 'query' | 'execute'>;

/** The signed FAP form (crm_master_document_types.code); uploading it unlocks "Submit FAP stage". */
export const FAP_DOCUMENT_CODE = 'FAP';

const fileModel = (f: any) => ({
  id: f.id,
  checklistId: f.checklist_id,
  applicationId: f.application_id,
  fileName: f.file_name,
  fileKey: f.storage_key,
  storagePath: f.storage_path,
  version: f.version_number,
  isCurrent: !!f.is_current_active,
  fileSize: Number(f.file_size),
  mimeType: f.mime_type,
  uploadedBy: f.uploaded_by,
  createdAt: f.uploaded_at || f.created_at,
});

/**
 * Document checklist of an application (crm_application_document_checklists): the default documents of its workflow
 * stages plus what was added for it (crm_application_document_overrides), and the uploaded files
 * (crm_application_document_files, versioned, soft-deleted).
 */
/**
 * Whether a checklist document is mandatory is not stored on the checklist: it follows the workflow. The override of the
 * application wins, then the document of the workflow stage. Needs the aliases o (override) and sd (workflow stage
 * document).
 */
const MANDATORY = 'COALESCE(o.is_mandatory,sd.is_mandatory,0)';

@Injectable()
export class DocumentsRepository {
  constructor(private readonly db: CrmDatabase) {}

  /**
   * Adds the checklist rows the application does not have yet: the default documents of every stage of its workflow
   * (is_default=1) minus the ones removed for this application, plus the documents added for it (pool documents,
   * other master documents, free-name documents). Safe to run again: existing rows are kept.
   */
  async seedChecklist(conn: Conn, applicationId: string, workflowFreezeId: string, by: string | null) {
    await conn.execute(
      `INSERT IGNORE INTO ${CRM.applicationDocumentChecklists}
         (id,application_id,workflow_freeze_id,stage_code,document_type_id,document_code,source_type,override_id,assigned_role,
          created_by)
       SELECT UUID(),?,sd.workflow_freeze_id,sd.stage_code,sd.document_type_id,t.code,IF(sd.is_default=1,'DEFAULT','ADDED'),o.id,
              COALESCE(o.department_code,st.department_code),?
       FROM ${CRM.frozenWorkflowStageDocuments} sd
       JOIN ${CRM.frozenWorkflowStages} st ON st.workflow_freeze_id=sd.workflow_freeze_id AND st.code=sd.stage_code
       JOIN ${CRM.masterDocumentTypes} t ON t.id=sd.document_type_id
       LEFT JOIN ${CRM.applicationDocumentOverrides} o
              ON o.application_id=? AND o.stage_code=sd.stage_code AND o.document_code=sd.document_code AND o.document_type_id IS NULL AND o.custom_name IS NULL AND o.is_active=1
       WHERE sd.workflow_freeze_id=?
         AND ((sd.is_default=1 AND (o.id IS NULL OR o.action<>'REMOVE')) OR (sd.is_default=0 AND o.action='ADD'))`,
      [applicationId, by, applicationId, workflowFreezeId],
    );
    await conn.execute(
      `INSERT IGNORE INTO ${CRM.applicationDocumentChecklists}
         (id,application_id,workflow_freeze_id,stage_code,document_type_id,document_code,source_type,override_id,assigned_role,created_by)
       SELECT UUID(),o.application_id,o.workflow_freeze_id,o.stage_code,o.document_type_id,o.document_code,'ADDED',o.id,
              COALESCE(o.department_code,st.department_code),?
       FROM ${CRM.applicationDocumentOverrides} o
       JOIN ${CRM.frozenWorkflowStages} st ON st.workflow_freeze_id=o.workflow_freeze_id AND st.code=o.stage_code
       WHERE o.application_id=? AND o.action='ADD' AND o.is_active=1 AND (o.document_type_id IS NOT NULL OR o.custom_name IS NOT NULL)`,
      [by, applicationId],
    );
  }

  /**
   * The department codes the CRM already uses on a stage or on a document override. The list a person chooses from is made by the
   * workflow service (the departments of User Management plus these), because this file may only name CRM tables.
   */
  async departments(): Promise<{code: string; name: string}[]> {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT department_code FROM (
         SELECT department_code FROM ${CRM.frozenWorkflowStages}
         UNION SELECT department_code FROM ${CRM.applicationDocumentOverrides}
       ) d WHERE department_code IS NOT NULL AND department_code<>'' ORDER BY department_code`,
    );
    return rows.map(r => ({code: String(r.department_code), name: String(r.department_code)}));
  }

  /** A checklist row with no file and no approval can be removed without losing work. */
  private async untouched(conn: Conn, checklistId: string) {
    const [rows] = await conn.execute<any[]>(
      `SELECT c.status,
              (SELECT COUNT(*) FROM ${CRM.applicationDocumentFiles} f WHERE f.checklist_id=c.id AND f.deleted_at IS NULL) AS files
       FROM ${CRM.applicationDocumentChecklists} c WHERE c.id=? FOR UPDATE`,
      [checklistId],
    );
    const r = rows[0];
    return !r || (Number(r.files) === 0 && r.status === 'PENDING');
  }

  /** What a user can add to one application's checklist, and what has been customised already. */
  async overrideOptions(applicationId: string, workflowFreezeId: string) {
    const [pool] = await this.db.pool.execute<any[]>(
      `SELECT sd.stage_code,t.code,t.name,sd.is_mandatory
       FROM ${CRM.frozenWorkflowStageDocuments} sd
       JOIN ${CRM.masterDocumentTypes} t ON t.id=sd.document_type_id
       WHERE sd.workflow_freeze_id=? AND sd.is_default=0
         AND NOT EXISTS (SELECT 1 FROM ${CRM.applicationDocumentOverrides} o
                         WHERE o.application_id=? AND o.stage_code=sd.stage_code AND o.document_code=sd.document_code AND o.document_type_id IS NULL AND o.custom_name IS NULL AND o.is_active=1)
       ORDER BY sd.stage_code,sd.sort_order`,
      [workflowFreezeId, applicationId],
    );
    const [masters] = await this.db.pool.execute<any[]>(
      `SELECT t.code,t.name FROM ${CRM.masterDocumentTypes} t
       WHERE NOT EXISTS (SELECT 1 FROM ${CRM.frozenWorkflowStageDocuments} sd
                         WHERE sd.workflow_freeze_id=? AND sd.document_type_id=t.id)
         AND NOT EXISTS (SELECT 1 FROM ${CRM.applicationDocumentOverrides} o
                         WHERE o.application_id=? AND o.document_type_id=t.id AND o.is_active=1)
       ORDER BY t.sort_order`,
      [workflowFreezeId, applicationId],
    );
    const [overrides] = await this.db.pool.execute<any[]>(
      `SELECT o.id,o.action,o.stage_code,o.reason,o.custom_name,
              o.department_code,o.is_mandatory,o.created_by,o.created_at,
              COALESCE(t.code,t2.code) AS code,COALESCE(t.name,t2.name,o.custom_name) AS name
       FROM ${CRM.applicationDocumentOverrides} o
       LEFT JOIN ${CRM.masterDocumentTypes} t ON t.id=o.document_type_id
       LEFT JOIN ${CRM.masterDocumentTypes} t2 ON t2.code=o.document_code
       WHERE o.application_id=? AND o.is_active=1 ORDER BY o.created_at`,
      [applicationId],
    );
    return {
      pool: pool.map(r => ({
        stageCode: r.stage_code,
        code: r.code,
        name: r.name,
        isMandatory: !!r.is_mandatory,
      })),
      masters: masters.map(r => ({code: r.code, name: r.name})),
      overrides: overrides.map(r => ({
        id: r.id,
        action: r.action,
        stageCode: r.stage_code,
        code: r.code,
        name: r.name,
        customName: r.custom_name,
        departmentCode: r.department_code,
        isMandatory: r.is_mandatory === null ? null : !!r.is_mandatory,
        reason: r.reason,
        by: r.created_by,
        at: r.created_at,
      })),
    };
  }

  /**
   * ADD or REMOVE one document for one application. REMOVE only works on a default document of the application's
   * workflow, and only while it holds no file and no check.
   */
  async addOverride(
    conn: Conn,
    o: {
      applicationId: string;
      workflowFreezeId: string;
      stageCode: string;
      action: 'ADD' | 'REMOVE';
      /** A document the workflow offers in this stage (stage + document code). */
      workflowDocumentCode?: string | null;
      /** Another master document type. */
      documentCode?: string | null;
      customName?: string | null;
      description?: string | null;
      departmentCode?: string | null;
      isMandatory?: boolean | null;
      reason?: string | null;
      userId?: number | null;
      userName: string;
    },
  ) {
    const [stage] = await conn.execute<any[]>(`SELECT code FROM ${CRM.frozenWorkflowStages} WHERE code=? AND workflow_freeze_id=?`, [o.stageCode, o.workflowFreezeId]);
    ensure(stage.length, 'Stage does not belong to the workflow of this application', 422);
    const wsdCode = o.workflowDocumentCode || null;
    let typeId: string | null = null;
    let sd: any = null;
    if (wsdCode) {
      const [rows] = await conn.execute<any[]>(
        `SELECT * FROM ${CRM.frozenWorkflowStageDocuments} WHERE workflow_freeze_id=? AND stage_code=? AND document_code=?`,
        [o.workflowFreezeId, o.stageCode, wsdCode],
      );
      sd = rows[0];
      ensure(sd, 'Document is not part of this stage', 422);
    }
    if (o.action === 'REMOVE') {
      ensure(sd && sd.is_default, 'Only a default document of the stage can be removed', 422);
      const [row] = await conn.execute<any[]>(
        `SELECT id FROM ${CRM.applicationDocumentChecklists} WHERE application_id=? AND stage_code=? AND document_code=?`,
        [o.applicationId, o.stageCode, wsdCode],
      );
      if (row[0]) {
        ensure(await this.untouched(conn, row[0].id), 'This document already has a file or a check and cannot be removed', 409);
        await conn.execute(`DELETE FROM ${CRM.applicationDocumentChecklists} WHERE id=?`, [row[0].id]);
      }
    } else if (wsdCode) {
      ensure(!sd.is_default, 'This document is already on the checklist', 409);
      ensure(o.departmentCode, 'Choose the department responsible for the document', 422);
    } else if (o.documentCode) {
      ensure(o.departmentCode, 'Choose the department responsible for the document', 422);
      const [rows] = await conn.execute<any[]>(`SELECT id FROM ${CRM.masterDocumentTypes} WHERE code=?`, [o.documentCode as string]);
      ensure(rows[0], 'Document type not found', 404);
      typeId = rows[0].id;
      const [dup] = await conn.execute<any[]>(
        `SELECT id FROM ${CRM.applicationDocumentChecklists} WHERE application_id=? AND stage_code=? AND document_type_id=?`,
        [o.applicationId, o.stageCode, typeId],
      );
      ensure(!dup.length, 'This document is already on the checklist of the stage', 409);
    } else {
      ensure(String(o.customName || '').trim(), 'Give the document a name', 422);
      ensure(o.departmentCode, 'Choose the department responsible for the document', 422);
      // the same name twice in one stage is the same document: refused like the master and workflow documents are
      const [same] = await conn.execute<any[]>(
        `SELECT id FROM ${CRM.applicationDocumentOverrides}
         WHERE application_id=? AND stage_code=? AND action='ADD' AND is_active=1 AND LOWER(TRIM(custom_name))=LOWER(?)`,
        [o.applicationId, o.stageCode, String(o.customName).trim()],
      );
      ensure(!same.length, 'A document with this name is already on the checklist of the stage', 409);
    }
    // one live customisation per document of a stage (the old unique key on the workflow document did this)
    const docCode = wsdCode ?? o.documentCode ?? null;
    if (docCode) {
      const [live] = await conn.execute<any[]>(
        `SELECT id FROM ${CRM.applicationDocumentOverrides} WHERE application_id=? AND stage_code=? AND document_code=? AND is_active=1 FOR UPDATE`,
        [o.applicationId, o.stageCode, docCode],
      );
      ensure(!live.length, 'This document was already customised for this application. Undo that first.', 409);
    }
    if (wsdCode)
      await conn.execute(
        `DELETE FROM ${CRM.applicationDocumentOverrides} WHERE application_id=? AND stage_code=? AND document_code=? AND document_type_id IS NULL AND custom_name IS NULL AND is_active=0`,
        [o.applicationId, o.stageCode, wsdCode],
      );
    const id = crypto.randomUUID();
    await conn.execute(
      `INSERT INTO ${CRM.applicationDocumentOverrides}
         (id,application_id,workflow_freeze_id,stage_code,action,document_type_id,document_code,custom_name,description,
          department_code,is_mandatory,reason,added_by_user_id,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        o.applicationId,
        o.workflowFreezeId,
        o.stageCode,
        o.action,
        typeId,
        wsdCode ?? o.documentCode ?? null,
        wsdCode || typeId ? null : String(o.customName).trim(),
        o.description || null,
        o.action === 'ADD' ? (o.departmentCode ?? null) : null,
        o.isMandatory === undefined || o.isMandatory === null ? null : o.isMandatory ? 1 : 0,
        o.reason || null,
        o.userId ?? null,
        o.userName,
      ],
    );
    await this.seedChecklist(conn, o.applicationId, o.workflowFreezeId, o.userName);
    return id;
  }

  /** Cancels a customisation: the document goes back to what the workflow says. */
  async cancelOverride(conn: Conn, applicationId: string, workflowFreezeId: string, overrideId: string, by: string) {
    const [rows] = await conn.execute<any[]>(
      `SELECT * FROM ${CRM.applicationDocumentOverrides} WHERE id=? AND application_id=? AND is_active=1 FOR UPDATE`,
      [overrideId, applicationId],
    );
    const o = rows[0];
    ensure(o, 'Customisation not found', 404);
    if (o.action === 'ADD') {
      const [row] = await conn.execute<any[]>(`SELECT id FROM ${CRM.applicationDocumentChecklists} WHERE application_id=? AND override_id=?`, [
        applicationId,
        overrideId,
      ]);
      if (row[0]) {
        ensure(await this.untouched(conn, row[0].id), 'This document already has a file or a check and cannot be taken off', 409);
        await conn.execute(`DELETE FROM ${CRM.applicationDocumentChecklists} WHERE id=?`, [row[0].id]);
      }
    }
    await conn.execute(`UPDATE ${CRM.applicationDocumentOverrides} SET is_active=0,updated_by=? WHERE id=?`, [by, overrideId]);
    await this.seedChecklist(conn, applicationId, workflowFreezeId, by);
  }

  /** Checklist rows with their files, in the shape the Documents tab uses. */
  async read(applicationId: string, conn: Conn = this.db.pool) {
    const [rows] = await conn.execute<any[]>(
      `SELECT c.*,COALESCE(t.code,CONCAT('CUSTOM_',LEFT(c.id,8))) AS code,COALESCE(t.name,o.custom_name) AS name,
              COALESCE(s.code,c.stage_code) AS stage_code,COALESCE(s.name,c.stage_code) AS stage_name,${MANDATORY} AS is_mandatory
       FROM ${CRM.applicationDocumentChecklists} c
       LEFT JOIN ${CRM.frozenWorkflowStages} s ON (s.workflow_freeze_id=c.workflow_freeze_id OR s.workflow_freeze_id=(SELECT workflow_freeze_id FROM ${CRM.applications} WHERE id=c.application_id)) AND s.code=c.stage_code
       LEFT JOIN ${CRM.masterDocumentTypes} t ON t.id=c.document_type_id
       LEFT JOIN ${CRM.applicationDocumentOverrides} o ON o.id=c.override_id
       LEFT JOIN ${CRM.frozenWorkflowStageDocuments} sd ON (sd.workflow_freeze_id=c.workflow_freeze_id OR sd.workflow_freeze_id=(SELECT workflow_freeze_id FROM ${CRM.applications} WHERE id=c.application_id)) AND sd.stage_code=c.stage_code AND sd.document_code=c.document_code
       WHERE c.application_id=? ORDER BY COALESCE(t.sort_order,100000),c.created_at`,
      [applicationId],
    );
    const [files] = await conn.execute<any[]>(
      `SELECT * FROM ${CRM.applicationDocumentFiles} WHERE application_id=? AND deleted_at IS NULL
       ORDER BY version_number,uploaded_at`,
      [applicationId],
    );
    return rows.map(d => ({
      id: d.id,
      applicationId: d.application_id,
      documentCode: d.code,
      documentName: d.name,
      /** Workflow stage the document belongs to (crm_application_document_checklists.stage_code). */
      stageCode: d.stage_code,
      stageName: d.stage_name,
      /** DEFAULT = from the workflow; ADDED = added for this application only. */
      source: d.source_type,
      overrideId: d.override_id,
      assignedRole: d.assigned_role,
      isMandatory: !!d.is_mandatory,
      status: d.status,
      files: files.filter(f => f.checklist_id === d.id).map(fileModel),
    }));
  }

  async readFile(fileId: string) {
    const [rows] = await this.db.pool.execute<any[]>(
      `SELECT * FROM ${CRM.applicationDocumentFiles} WHERE id=? AND deleted_at IS NULL`,
      [fileId],
    );
    return rows[0] ? fileModel(rows[0]) : null;
  }

  /** The checklist row of a document with the number of files it has and the stage and document code it comes from (for its approval). */
  async approvalRow(applicationId: string, checklistId: string) {
    const [rows] = await this.db.pool.execute<any[]>(
      `SELECT c.stage_code,c.document_code,(SELECT COUNT(*) FROM ${CRM.applicationDocumentFiles} f WHERE f.checklist_id=c.id AND f.deleted_at IS NULL) AS n
       FROM ${CRM.applicationDocumentChecklists} c WHERE c.id=? AND c.application_id=?`,
      [checklistId, applicationId],
    );
    return rows[0] ? {stageCode: rows[0].stage_code as string, documentCode: rows[0].document_code as string | null, fileCount: Number(rows[0].n)} : null;
  }

  /** Every file of the application's checklist (the ones the checklist lists), with its document and stage, for the ZIP. */
  async filesForZip(applicationId: string) {
    const [rows] = await this.db.pool.execute<any[]>(
      `SELECT f.id,f.file_name,f.storage_key,f.version_number,t.code,t.sort_order,s.name AS stage_name
       FROM ${CRM.applicationDocumentFiles} f
       JOIN ${CRM.applicationDocumentChecklists} c ON c.id=f.checklist_id
       JOIN ${CRM.masterDocumentTypes} t ON t.id=c.document_type_id
       LEFT JOIN ${CRM.frozenWorkflowStages} s ON s.workflow_freeze_id=c.workflow_freeze_id AND s.code=c.stage_code
       WHERE f.application_id=? AND f.deleted_at IS NULL
       ORDER BY t.sort_order,f.version_number,f.uploaded_at`,
      [applicationId],
    );
    return rows.map(r => ({
      id: r.id as string,
      fileName: r.file_name as string,
      fileKey: r.storage_key as string,
      version: Number(r.version_number),
      code: r.code as string,
      stageName: (r.stage_name as string | null) ?? '',
    }));
  }

  /** The checklist row by its id or by its document type code. */
  async checklistRow(conn: Conn, applicationId: string, idOrCode: string) {
    const [rows] = await conn.execute<any[]>(
      `SELECT c.*,COALESCE(t.code,c.document_code,CONCAT('CUSTOM_',LEFT(c.id,8))) AS code FROM ${CRM.applicationDocumentChecklists} c
       LEFT JOIN ${CRM.masterDocumentTypes} t ON t.id=c.document_type_id
       WHERE c.application_id=? AND (c.id=? OR t.code=? OR c.document_code=?) FOR UPDATE`,
      [applicationId, idOrCode, String(idOrCode).toUpperCase(), String(idOrCode).toUpperCase()],
    );
    return rows[0] || null;
  }

  /** Stores a new file version; earlier versions stay, the new one is the current one. */
  async addFile(
    conn: Conn,
    applicationId: string,
    checklistIdOrCode: string,
    file: {fileName: string; storageKey: string; storagePath: string | null; size: number; mimeType: string},
    by: string,
  ) {
    const row = await this.checklistRow(conn, applicationId, checklistIdOrCode);
    ensure(row, 'Checklist item not found', 404);
    const [[last]] = await conn.execute<any[]>(
      `SELECT COALESCE(MAX(version_number),0) AS v FROM ${CRM.applicationDocumentFiles} WHERE checklist_id=?`,
      [row.id],
    );
    await conn.execute(`UPDATE ${CRM.applicationDocumentFiles} SET is_current_active=0 WHERE checklist_id=?`, [row.id]);
    const id = crypto.randomUUID();
    await conn.execute(
      `INSERT INTO ${CRM.applicationDocumentFiles}
         (id,checklist_id,application_id,version_number,file_name,storage_key,storage_path,file_size,mime_type,
          is_current_active,uploaded_by,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,1,?,?)`,
      [id, row.id, applicationId, Number(last.v) + 1, file.fileName, file.storageKey, file.storagePath, file.size, file.mimeType, by, by],
    );
    // A new file makes the document UPLOADED again, also when it was verified: the checklist document is one bundle, so it needs its approval again
    // (the approval of a document that changed after it was approved can be asked for once more: see ApprovalsService.startScope).
    await this.setStatus(conn, row.id, 'UPLOADED', by);
    await this.syncFapUploaded(conn, applicationId, by);
    return {id, checklistId: row.id, documentCode: row.code};
  }

  /** Soft-deletes a file; the newest remaining version becomes current and the checklist row follows. */
  async deleteFile(conn: Conn, applicationId: string, fileId: string, by: string | null) {
    const [rows] = await conn.execute<any[]>(
      `SELECT checklist_id FROM ${CRM.applicationDocumentFiles} WHERE id=? AND application_id=? AND deleted_at IS NULL FOR UPDATE`,
      [fileId, applicationId],
    );
    ensure(rows.length, 'File not found in this application', 404);
    const checklistId = rows[0].checklist_id;
    // a document in verification or already verified keeps its file: deleting it would leave an approval about nothing
    const [state] = await conn.execute<any[]>(`SELECT status FROM ${CRM.applicationDocumentChecklists} WHERE id=?`, [checklistId]);
    const [running] = await conn.execute<any[]>(
      `SELECT 1 FROM ${CRM.applicationApprovalSteps} WHERE document_checklist_id=? AND status IN ('PENDING','WAITING') LIMIT 1`,
      [checklistId],
    );
    ensure(!running.length && state[0]?.status !== 'VERIFIED', 'The file of a document that is being verified, or is verified, cannot be deleted', 409);
    await conn.execute(
      `UPDATE ${CRM.applicationDocumentFiles} SET deleted_at=CURRENT_TIMESTAMP(3),is_current_active=0,updated_by=? WHERE id=?`,
      [by, fileId],
    );
    const [remaining] = await conn.execute<any[]>(
      `SELECT id FROM ${CRM.applicationDocumentFiles} WHERE checklist_id=? AND deleted_at IS NULL ORDER BY version_number DESC LIMIT 1`,
      [checklistId],
    );
    if (remaining.length)
      await conn.execute(`UPDATE ${CRM.applicationDocumentFiles} SET is_current_active=1 WHERE id=?`, [remaining[0].id]);
    await this.setStatus(conn, checklistId, remaining.length ? 'UPLOADED' : 'PENDING', by);
    await this.syncFapUploaded(conn, applicationId, by);
  }

  /**
   * The ONE place that writes the status of a checklist row (crm_application_document_checklists.status). It follows the files and the approval of the
   * document: PENDING without a file, UPLOADED with a file (or asked for approval again), VERIFIED when the approval is approved, REJECTED when it is
   * rejected or opened again. It is stored (not computed) because the lists read it for every application: a stored value costs 2 ms where the computed
   * one cost 57 s for 552 applications (measured).
   */
  async setStatus(conn: Conn, checklistId: string, status: 'PENDING' | 'UPLOADED' | 'VERIFIED' | 'REJECTED', by: string | null) {
    await conn.execute(`UPDATE ${CRM.applicationDocumentChecklists} SET status=?,updated_by=? WHERE id=?`, [status, by, checklistId]);
  }

  /** The FAP profile's is_fap_doc_uploaded follows whether the signed FAP form has a file. */
  async syncFapUploaded(conn: Conn, applicationId: string, by: string | null) {
    const [rows] = await conn.execute<any[]>(
      `SELECT COUNT(f.id) AS n FROM ${CRM.applicationDocumentFiles} f
       JOIN ${CRM.applicationDocumentChecklists} c ON c.id=f.checklist_id
       JOIN ${CRM.masterDocumentTypes} t ON t.id=c.document_type_id
       WHERE f.application_id=? AND f.deleted_at IS NULL AND t.code=?`,
      [applicationId, FAP_DOCUMENT_CODE],
    );
    await conn.execute(`UPDATE ${CRM.fapApplicationProfiles} SET is_fap_doc_uploaded=?,updated_by=? WHERE application_id=?`, [
      Number(rows[0].n) > 0 ? 1 : 0,
      by,
      applicationId,
    ]);
  }

  /** The current file of the signed FAP form, if any. */
  async currentFapFile(applicationId: string) {
    const docs = await this.read(applicationId);
    const fap = docs.find(d => d.documentCode === FAP_DOCUMENT_CODE);
    const file = fap?.files.find(f => f.isCurrent) || fap?.files[fap.files.length - 1];
    return {fap, file};
  }

  /** Every checklist row of every application, for the Document Desk. */
  async desk() {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT c.id AS checklist_id,c.application_id,a.application_number,COALESCE(t.code,CONCAT('CUSTOM_',LEFT(c.id,8))) AS document_code,
              COALESCE(t.name,o.custom_name) AS document_name,c.assigned_role,
              ${MANDATORY} AS is_mandatory,c.status,p.company_name,
              (SELECT COUNT(*) FROM ${CRM.applicationDocumentFiles} f WHERE f.checklist_id=c.id AND f.deleted_at IS NULL) AS file_count
       FROM ${CRM.applicationDocumentChecklists} c
       LEFT JOIN ${CRM.masterDocumentTypes} t ON t.id=c.document_type_id
       LEFT JOIN ${CRM.applicationDocumentOverrides} o ON o.id=c.override_id
       LEFT JOIN ${CRM.frozenWorkflowStageDocuments} sd ON sd.workflow_freeze_id=c.workflow_freeze_id AND sd.stage_code=c.stage_code AND sd.document_code=c.document_code
       JOIN ${CRM.applications} a ON a.id=c.application_id AND a.deleted_at IS NULL
       LEFT JOIN ${CRM.fapApplicationProfiles} p ON p.application_id=a.id
       ORDER BY CASE c.status WHEN 'REJECTED' THEN 0 WHEN 'PENDING' THEN 1 WHEN 'UPLOADED' THEN 2 ELSE 3 END,
                a.created_at DESC,COALESCE(t.sort_order,100000)`,
    );
    return rows;
  }

  /** Verified and total checklist rows per application (application list). */
  async counts(): Promise<Map<string, {verified: number; total: number}>> {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT application_id,SUM(status='VERIFIED') AS verified,COUNT(*) AS total
       FROM ${CRM.applicationDocumentChecklists} GROUP BY application_id`,
    );
    return new Map(rows.map(r => [r.application_id, {verified: Number(r.verified), total: Number(r.total)}]));
  }
}
