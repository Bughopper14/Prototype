import crypto from 'node:crypto';
import type {MasterCatalog, MasterItem} from '@liugong/shared';
import {Injectable} from '@nestjs/common';
import {CrmDatabase} from '../../../core/db/crm-database';
import {CRM} from '../../../core/db/crm-tables';
import {DocumentsRepository} from '../../documents/documents.repository';

/** Document types for the checklist. `stage` is the workflow stage code (FAP_STAGE, PRE_ANALYSIS, ICLF) or absent. */
@Injectable()
export class DocumentMastersRepository {
  static readonly groups = ['documents'];
  constructor(
    private readonly db: CrmDatabase,
    private readonly checklists: DocumentsRepository,
  ) {}

  async catalog(catalog: MasterCatalog): Promise<MasterCatalog> {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT d.code,d.name,d.title,d.department_code,d.default_section,d.description,d.is_mandatory,d.is_active,
              s.code AS stage_code
       FROM ${CRM.masterDocumentTypes} d LEFT JOIN ${CRM.masterWorkflowStages} s ON s.id=d.stage_id
       ORDER BY d.sort_order,d.created_at,d.id`,
    );
    return {
      ...catalog,
      documents: rows.map(
        row =>
          ({
            value: row.code,
            name: row.name,
            title: row.title,
            role: row.department_code,
            required: !!row.is_mandatory,
            active: !!row.is_active,
            ...(row.default_section ? {section: row.default_section} : {}),
            ...(row.description ? {description: row.description} : {}),
            ...(row.stage_code ? {stage: row.stage_code} : {}),
          }) satisfies MasterItem,
      ),
    };
  }

  /** The Master Data screen edits name, department, required and active. A new type gets its name as title. */
  async save(catalog: MasterCatalog, by: string | null) {
    await this.db.transaction(async c => {
      for (const item of catalog.documents || []) {
        const [rows] = await c.execute<any[]>(
          `SELECT name,department_code,is_mandatory,is_active FROM ${CRM.masterDocumentTypes} WHERE code=? FOR UPDATE`,
          [item.value],
        );
        const department = item.role || 'BS';
        if (rows.length) {
          const old = rows[0];
          if (
            old.name !== item.name ||
            old.department_code !== department ||
            !!old.is_mandatory !== !!item.required ||
            !!old.is_active !== item.active
          )
            await c.execute(
              `UPDATE ${CRM.masterDocumentTypes} SET name=?,department_code=?,is_mandatory=?,is_active=?,updated_by=?
               WHERE code=?`,
              [item.name, department, item.required ? 1 : 0, item.active ? 1 : 0, by, item.value],
            );
        } else
          await c.execute(
            `INSERT INTO ${CRM.masterDocumentTypes}
               (id,code,name,title,department_code,is_mandatory,is_active,sort_order,created_by)
             SELECT ?,?,?,?,?,?,?,COALESCE(MAX(sort_order),0)+1,? FROM ${CRM.masterDocumentTypes}`,
            [
              crypto.randomUUID(),
              item.value,
              item.name,
              item.title || item.name,
              department,
              item.required ? 1 : 0,
              item.active ? 1 : 0,
              by,
            ],
          );
      }
    });
    // Every application gets the new document types in its checklist.
    await this.checklists.syncAllApplications(by);
  }
}
