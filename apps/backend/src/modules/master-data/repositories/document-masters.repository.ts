import crypto from 'node:crypto';
import type {MasterCatalog, MasterItem} from '@liugong/shared';
import {Injectable} from '@nestjs/common';
import {CrmDatabase} from '../../../core/db/crm-database';
import {CRM} from '../../../core/db/crm-tables';
import {toCode} from '../../../core/domain/code';

/** Document types for the checklist (a catalog; which stage lists which document is set in Workflow setup). */
@Injectable()
export class DocumentMastersRepository {
  static readonly groups = ['documents'];
  constructor(private readonly db: CrmDatabase) {}

  async catalog(catalog: MasterCatalog): Promise<MasterCatalog> {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT d.code,d.name,d.title,d.default_section,d.description FROM ${CRM.masterDocumentTypes} d
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
            active: true,
            ...(row.default_section ? {section: row.default_section} : {}),
            ...(row.description ? {description: row.description} : {}),
          }) satisfies MasterItem,
      ),
    };
  }

  /** The Master Data screen edits the name of a document type. A new type gets its name as title. */
  async save(catalog: MasterCatalog, by: string | null) {
    await this.db.transaction(async c => {
      for (const item of catalog.documents || []) {
        const [rows] = await c.execute<any[]>(`SELECT name FROM ${CRM.masterDocumentTypes} WHERE code=? FOR UPDATE`, [item.value]);
        if (rows.length) {
          if (rows[0].name !== item.name)
            await c.execute(`UPDATE ${CRM.masterDocumentTypes} SET name=?,updated_by=? WHERE code=?`, [item.name, by, item.value]);
        } else
          await c.execute(
            `INSERT INTO ${CRM.masterDocumentTypes} (id,code,name,title,sort_order,created_by)
             SELECT ?,?,?,?,COALESCE(MAX(sort_order),0)+1,? FROM ${CRM.masterDocumentTypes}`,
            [crypto.randomUUID(), toCode(item.value), item.name, item.title || item.name, by],
          );
      }
    });
    // A new document type only joins the catalog: a workflow stage lists it (Workflow setup) before any checklist shows it.
  }
}
