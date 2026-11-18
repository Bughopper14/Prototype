import {businessToday} from '@liugong/shared';
import {Injectable} from '@nestjs/common';
import {CrmDatabase} from '../../core/db/crm-database';
import {ensure} from '../../core/domain';
import {ApplicationsService} from '../applications/applications.service';
import type {Actor} from '../auth/session';
import {PreAnalysisRepository} from './pre-analysis.repository';
import {createBlankPreAnalysisData} from './store/defaults';
import {generatePreAnalysisNo} from './store/numbering';

/** A value the form has not filled in yet (empty, or the "Auto (generated on save)" placeholder). */
const missing = (v: unknown) => !v || String(v).includes('Auto') || String(v).trim() === '';
const by = (actor: Actor) => actor.username || null;

/** The form and its version (the time of its last change, to be sent back when saving). */
export type PreAnalysisForm = {data: any; version: string};

/** Loading and saving the Pre-Analysis of an application. */
@Injectable()
export class PreAnalysisService {
  constructor(
    private readonly db: CrmDatabase,
    private readonly applications: ApplicationsService,
    private readonly repo: PreAnalysisRepository,
  ) {}

  /** The stored form; the first time it is opened it is created from the application. */
  async get(id: string, actor: Actor): Promise<PreAnalysisForm> {
    const app: any = await this.applications.detailOr404(id, actor);
    const stored = await this.repo.load(id);
    if (!stored) {
      // The form starts without a Pre-Analysis number; it is made on request (generateNumber).
      const blank = createBlankPreAnalysisData(await this.withNames(app));
      return {data: blank, version: await this.repo.save(id, blank, by(actor))};
    }
    // Key FAP information that was still empty when the form was created follows the application.
    const data = stored.data;
    let changed = false;
    const company = app.customer?.companyName || app.companyName;
    const npwp = app.customer?.npwp || app.npwp;
    if (company && !data.customerProjectName) {
      data.customerProjectName = company;
      changed = true;
    }
    if (npwp && !data.taxId) {
      data.taxId = npwp;
      changed = true;
    }
    if (app.fapNumber && !data.fapNumber) {
      data.fapNumber = app.fapNumber;
      changed = true;
    }
    if (!changed) return {data, version: stored.version};
    return {data, version: await this.repo.save(id, data, by(actor))};
  }

  /** The application with the names the form shows (area, PIC position) instead of the ids / codes it stores. */
  private async withNames(app: any) {
    const names = await this.repo.names([app.province, app.city, app.pic?.position]);
    const name = (v: unknown) => (typeof v === 'string' ? (names.get(v) ?? v) : v);
    return {
      ...app,
      province: name(app.province),
      city: name(app.city),
      pic: app.pic && {...app.pic, position: name(app.pic.position)},
    };
  }

  /** Saves the form; `expectedVersion` is the version the screen loaded (a newer one made by someone else is refused). */
  async save(id: string, body: unknown, actor: Actor, expectedVersion?: string | null): Promise<PreAnalysisForm> {
    ensure(body && typeof body === 'object' && !Array.isArray(body), 'Isi pra-analisis tidak valid.', 422);
    const app: any = await this.applications.detailOr404(id, actor);
    const data: any = {...(body as object)};
    // A form saved without its numbers gets them: its own number (kept when it already has one), FAP number, company
    if (missing(data.preAnalysisNo)) {
      const stored = await this.repo.find(id);
      if (stored && !missing(stored.preAnalysisNo)) data.preAnalysisNo = stored.preAnalysisNo;
    }
    if (missing(data.fapNumber)) data.fapNumber = app.fapNumber || '';
    if (missing(data.customerProjectName) || data.customerProjectName === 'New Applicant')
      data.customerProjectName = app.customer?.companyName || app.companyName || data.customerProjectName;
    return {data, version: await this.repo.save(id, data, by(actor), expectedVersion)};
  }

  /**
   * Makes the Pre-Analysis number on request: the next one of the year, under a named lock so two applications never
   * share a number. A form that already has a number keeps it (409).
   */
  async generateNumber(id: string, actor: Actor): Promise<PreAnalysisForm> {
    const form = await this.get(id, actor);
    ensure(missing(form.data.preAnalysisNo), 'The Pre-Analysis number was already generated.', 409);
    const today = businessToday();
    const lockName = `crm_preanalysis_number_${today.slice(0, 4)}`;
    const conn = await this.db.pool.getConnection();
    try {
      const [lock] = await conn.query<any[]>('SELECT GET_LOCK(?, 10) AS ok', [lockName]);
      ensure(Number(lock[0]?.ok) === 1, 'Nomor pra-analisis sedang dibuat pengguna lain. Coba lagi.', 409);
      try {
        const data = {...form.data, preAnalysisNo: generatePreAnalysisNo(await this.repo.numbers(), today)};
        return {data, version: await this.repo.save(id, data, by(actor))};
      } finally {
        await conn.query('SELECT RELEASE_LOCK(?)', [lockName]);
      }
    } finally {
      conn.release();
    }
  }
}
