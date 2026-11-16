import {Injectable} from '@nestjs/common';
import {CrmDatabase} from '../../core/db/crm-database';
import {CRM} from '../../core/db/crm-tables';
import {Problem, ensure} from '../../core/domain';

export type StoredPreAnalysis = {
  data: any;
  /** Time of the last change (ISO, milliseconds): the screen sends it back to show which version it edited. */
  version: string;
  changedBy: string | null;
};

const iso = (v: unknown) => new Date(v as string).toISOString();

/** The Pre-Analysis form of an application, stored as one JSON document (crm_prototype_preanalysis). */
@Injectable()
export class PreAnalysisRepository {
  constructor(private readonly db: CrmDatabase) {}

  async load(applicationId: string): Promise<StoredPreAnalysis | null> {
    const [rows] = await this.db.pool.execute<any[]>(
      `SELECT form_data,COALESCE(updated_at,created_at) AS version,COALESCE(updated_by,created_by) AS changed_by
       FROM ${CRM.prototypePreanalysis} WHERE application_id=?`,
      [applicationId],
    );
    const row = rows[0];
    return row ? {data: JSON.parse(row.form_data), version: iso(row.version), changedBy: row.changed_by} : null;
  }

  async find(applicationId: string): Promise<any | null> {
    return (await this.load(applicationId))?.data ?? null;
  }

  /**
   * Stores the form and returns its new version. When `expectedVersion` is given (the version the screen loaded), a form
   * that someone else changed since is refused (409), so two people editing at the same time never overwrite each
   * other silently. The user's own earlier saves (also from another tab) never count as a conflict.
   */
  async save(applicationId: string, data: unknown, by: string | null, expectedVersion?: string | null) {
    return this.db.transaction(async conn => {
      const [rows] = await conn.execute<any[]>(
        `SELECT COALESCE(updated_at,created_at) AS version,COALESCE(updated_by,created_by) AS changed_by
         FROM ${CRM.prototypePreanalysis} WHERE application_id=? FOR UPDATE`,
        [applicationId],
      );
      const current = rows[0];
      if (current && expectedVersion) {
        const seen = new Date(expectedVersion).getTime();
        ensure(Number.isFinite(seen), 'Versi pra-analisis tidak valid.', 422);
        const time = new Date(current.version).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta'});
        if (seen !== new Date(current.version).getTime() && current.changed_by !== by)
          throw new Problem(
            409,
            `Pra-analisis ini sudah diubah oleh ${current.changed_by || 'pengguna lain'} pada pukul ${time}. Perubahan Anda belum tersimpan; salin isian yang perlu, lalu muat ulang halaman untuk melihat data terbaru.`,
          );
      }
      await conn.execute(
        `INSERT INTO ${CRM.prototypePreanalysis} (application_id,form_data,created_by) VALUES (?,?,?)
         ON DUPLICATE KEY UPDATE form_data=VALUES(form_data),updated_by=?`,
        [applicationId, JSON.stringify(data), by, by],
      );
      const [after] = await conn.execute<any[]>(
        `SELECT COALESCE(updated_at,created_at) AS version FROM ${CRM.prototypePreanalysis} WHERE application_id=?`,
        [applicationId],
      );
      return iso(after[0].version);
    });
  }

  /** Names of provinces and cities (by id) and PIC positions (by code): the application stores ids and codes. */
  async names(values: unknown[]): Promise<Map<string, string>> {
    const wanted = [...new Set(values.filter((x): x is string => typeof x === 'string' && x !== ''))];
    if (!wanted.length) return new Map();
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT id AS k,name FROM ${CRM.masterProvinces} WHERE id IN (?)
       UNION ALL SELECT id,name FROM ${CRM.masterCities} WHERE id IN (?)
       UNION ALL SELECT code,name FROM ${CRM.masterPicPositions} WHERE code IN (?)`,
      [wanted, wanted, wanted],
    );
    return new Map(rows.map(r => [r.k as string, r.name as string]));
  }

  /** Every Pre-Analysis number in use (they live inside the forms). */
  async numbers(): Promise<string[]> {
    const [rows] = await this.db.pool.query<any[]>(`SELECT form_data FROM ${CRM.prototypePreanalysis}`);
    const numbers: string[] = [];
    for (const row of rows) {
      try {
        const no = JSON.parse(row.form_data)?.preAnalysisNo;
        if (no) numbers.push(String(no));
      } catch {
        // a form that is not valid JSON has no number
      }
    }
    return numbers;
  }
}
