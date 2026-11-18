import crypto from 'node:crypto';
import {Injectable} from '@nestjs/common';
import type {PoolConnection} from 'mysql2/promise';
import {FAP_TERMS_COLUMNS} from '@liugong/shared';
import {CrmDatabase} from '../../../core/db/crm-database';
import {CRM} from '../../../core/db/crm-tables';
import {installment} from '../../../core/domain';
import {clean} from './company-record';
import {MasterIdLookup, type CodeMaster} from './master-ids';

type Conn = Pick<PoolConnection, 'query' | 'execute'>;
const bad = (message: string) => Object.assign(new Error(message), {status: 422});

/** Reads an amount typed the Indonesian way ("1.500.000.000", "11,5", "11.5% Flat", "36 Bulan"). */
export function parseAmount(val: any): number | null {
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  const text = String(val ?? '').trim().replace(/[^\d.,-]/g, '');
  if (!text) return null;
  let n: number;
  if ((text.match(/\./g) || []).length > 1 || (text.includes('.') && text.includes(',')))
    n = Number(text.replace(/\./g, '').replace(',', '.'));
  else if ((text.match(/,/g) || []).length > 1) n = Number(text.replace(/,/g, ''));
  else if (/^\d+\.\d{3}$/.test(text)) n = Number(text.replace('.', ''));
  else n = Number(text.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

const num = (v: any) => (v === null || v === undefined || v === '' ? null : Number(v));

/** One repeated FAP section stored as rows (soft-deleted with deleted_at, ordered by row_position). */
type RowSection = {
  table: string;
  /** API field → column; `master` columns hold the id of that master's code. */
  fields: {key: string; column: string; master?: CodeMaster; type?: 'number' | 'enum'}[];
};

const PROJECTS: RowSection = {
  table: CRM.fapProjectContracts,
  fields: [
    {key: 'projectOwner', column: 'project_owner'},
    {key: 'projectLocation', column: 'project_location'},
    {key: 'projectRole', column: 'project_role_id', master: 'projectRole'},
    {key: 'contractStatus', column: 'contract_status', type: 'enum'},
  ],
};
const BANKS: RowSection = {
  table: CRM.fapBankFacilities,
  fields: [
    {key: 'bankOrFinInstitution', column: 'financial_institution_id', master: 'financialInstitution'},
    {key: 'currency', column: 'currency_id', master: 'currency'},
    {key: 'creditFacility', column: 'credit_facility', type: 'number'},
    {key: 'monthlyInstallment', column: 'monthly_installment', type: 'number'},
    {key: 'yearStarted', column: 'year_started', type: 'number'},
    {key: 'interestRate', column: 'interest_rate', type: 'number'},
    {key: 'paymentRecord', column: 'payment_record'},
    {key: 'facilityStatus', column: 'facility_status', type: 'enum'},
    {key: 'comments', column: 'comments'},
  ],
};
const UNITS: RowSection = {
  table: CRM.fapEquipmentUnits,
  fields: [
    {key: 'unitCategory', column: 'unit_category_id', master: 'unitCategory'},
    {key: 'brand', column: 'brand_id', master: 'brand'},
    {key: 'unitType', column: 'unit_type_id', master: 'unitType'},
    {key: 'modelName', column: 'model_id', master: 'model'},
    {key: 'assetName', column: 'asset_id', master: 'asset'},
    {key: 'classTon', column: 'class_ton', type: 'number'},
    {key: 'quantity', column: 'quantity', type: 'number'},
    {key: 'years', column: 'unit_year', type: 'number'},
    {key: 'specifications', column: 'specifications'},
  ],
};

/** Financing proposal summary: API field → column. */
const PROPOSAL_FIELDS: RowSection['fields'] = [
  {key: 'facilityPurpose', column: 'facility_purpose_id', master: 'facilityPurpose'},
  {key: 'purposeDetail', column: 'purpose_detail'},
  {key: 'financingMethod', column: 'financing_method_id', master: 'financingMethod'},
  {key: 'currency', column: 'currency_id', master: 'currency'},
  {key: 'financingValue', column: 'financing_value', type: 'number'},
  {key: 'downPaymentValue', column: 'down_payment_value', type: 'number'},
  {key: 'securityDeposit', column: 'security_deposit', type: 'number'},
  {key: 'interestRate', column: 'interest_rate', type: 'number'},
  {key: 'tenorMonths', column: 'tenor_months', type: 'number'},
  {key: 'paymentMethod', column: 'payment_timing_id', master: 'paymentTiming'},
  {key: 'applicationSource', column: 'application_source_id', master: 'applicationSource'},
];
/** Unit realization plan of section 08 (financingProposal.realizationPlan) → proposal columns. */
const REALIZATION = [
  ['lgHe', 'realization_liugong_he'],
  ['lgTruck', 'realization_liugong_truck'],
  ['nlgHe', 'realization_non_liugong_he'],
  ['nlgTruck', 'realization_non_liugong_truck'],
] as const;

/**
 * FAP sections 05–08 of an application on crm_liugong: financing purposes, projects, bank facilities, the financing
 * proposal with its equipment units, the three terms columns and the document requirements. The API keeps the shape
 * the workspace uses (projects, bankReferences, proposal, financingProposal, financingPurposeDetail).
 */
@Injectable()
export class FapSectionsRepository {
  constructor(
    private readonly db: CrmDatabase,
    private readonly ids: MasterIdLookup,
  ) {}

  /* ---------- read ---------- */

  private async readRows(section: RowSection, where: string, args: any[]) {
    const [rows] = await this.db.pool.execute<any[]>(
      `SELECT * FROM ${section.table} WHERE ${where} AND deleted_at IS NULL ORDER BY row_position,created_at,id`,
      args,
    );
    return Promise.all(rows.map(row => this.decode(section.fields, row)));
  }

  private async decode(fields: RowSection['fields'], row: any) {
    const out: Record<string, any> = {id: row.id, createdAt: row.created_at, updatedAt: row.updated_at};
    for (const f of fields)
      out[f.key] = f.master ? await this.ids.codeOf(f.master, row[f.column]) : f.type === 'number' ? num(row[f.column]) : row[f.column] ?? null;
    return out;
  }

  async read(applicationId: string) {
    const projects = await this.readRows(PROJECTS, 'application_id=?', [applicationId]);
    const bankReferences = await this.readRows(BANKS, 'application_id=?', [applicationId]);
    const [proposals] = await this.db.pool.execute<any[]>(
      `SELECT * FROM ${CRM.fapFinancingProposals} WHERE application_id=? AND is_active=1`,
      [applicationId],
    );
    const p = proposals[0];
    const proposal: Record<string, any> | null = p
      ? {
          ...(await this.decode(PROPOSAL_FIELDS, p)),
          termsNotes: p.proposal_notes ?? null,
          estimatedInstallment: num(p.estimated_monthly_installment),
          units: await this.readRows(UNITS, 'proposal_id=?', [p.id]),
        }
      : null;

    const financingProposal: Record<string, any> = {};
    if (p) {
      financingProposal.facilityProposed = {
        financingMethod: proposal!.financingMethod,
        currencyChoice: proposal!.currency,
        financingValue: p.financing_value_display ?? (p.financing_value === null ? '' : String(Number(p.financing_value))),
        applicationSource: proposal!.applicationSource,
      };
      financingProposal.realizationPlan = Object.fromEntries(REALIZATION.map(([k, c]) => [k, Number(p[c] ?? 0)]));
      financingProposal.notes = p.proposal_notes ?? '';
      // The Terms & Conditions of the financing method the customer asked for come from the proposal itself
      // (one column of the printed FAP; the other two do not exist for this application).
      const column = Object.entries(FAP_TERMS_COLUMNS).find(([, code]) => code === proposal!.financingMethod)?.[0];
      if (column) {
        const text = (v: unknown) => (v === null || v === undefined || Number(v) === 0 ? '' : String(Number(v)));
        financingProposal[column] = {
          workingCapitalInvestment: proposal!.facilityPurpose ?? '',
          currency: proposal!.currency ?? '',
          securityDeposit: text(p.security_deposit),
          downPayment: text(p.down_payment_value),
          interestRate: text(p.interest_rate),
          tenor: text(p.tenor_months),
          paymentMethod: proposal!.paymentMethod ?? '',
        };
      }
    }
    const [docs] = await this.db.pool.execute<any[]>(
      `SELECT m.code,d.is_checked FROM ${CRM.fapDocRequirements} d
       JOIN ${CRM.masterFapDocumentRequirements} m ON m.id=d.doc_requirement_id WHERE d.application_id=?`,
      [applicationId],
    );
    if (docs.length) financingProposal.documentRequirements = Object.fromEntries(docs.map(d => [d.code, !!d.is_checked]));

    const [purposes] = await this.db.pool.execute<any[]>(
      `SELECT m.code FROM ${CRM.fapFinancingPurposes} f
       JOIN ${CRM.masterFinancingPurposeOptions} m ON m.id=f.purpose_option_id
       WHERE f.application_id=? AND f.is_selected=1 ORDER BY m.sort_order`,
      [applicationId],
    );
    return {
      projects,
      bankReferences,
      proposal,
      financingProposal: Object.keys(financingProposal).length ? financingProposal : null,
      financingPurposeDetail: purposes.map(r => r.code).join(','),
    };
  }

  /* ---------- save ---------- */

  private async encode(conn: Conn, fields: RowSection['fields'], row: any) {
    const out: Record<string, any> = {};
    for (const f of fields) {
      const v = row?.[f.key];
      if (f.master) out[f.column] = await this.ids.idOf(f.master, v, conn);
      else if (f.type === 'number') out[f.column] = parseAmount(v);
      else if (f.type === 'enum') out[f.column] = clean(v) === null ? null : String(v).trim().toUpperCase();
      else out[f.column] = clean(v);
    }
    return out;
  }

  /** Replaces the rows of one section: known ids are updated, new rows inserted, missing rows soft-deleted. */
  private async saveRows(
    conn: Conn,
    section: RowSection,
    scope: Record<string, string>,
    rows: any[],
    by: string | null,
  ) {
    if (!Array.isArray(rows) || rows.length > 1000) throw bad('Maksimal 1000 baris per bagian.');
    const scopeSql = Object.keys(scope).map(k => `${k}=?`).join(' AND ');
    const [old] = await conn.execute<any[]>(`SELECT id FROM ${section.table} WHERE ${scopeSql} FOR UPDATE`, Object.values(scope));
    const known = new Set(old.map(r => r.id));
    const kept = new Set<string>();
    for (const [position, row] of rows.entries()) {
      const values = {...(await this.encode(conn, section.fields, row)), row_position: position};
      const id = row?.id && known.has(row.id) ? String(row.id) : crypto.randomUUID();
      if (kept.has(id)) throw bad('ID baris duplikat.');
      kept.add(id);
      const cols = Object.keys(values);
      if (known.has(id))
        await conn.execute(
          `UPDATE ${section.table} SET ${cols.map(c => `${c}=?`).join(',')},deleted_at=NULL,updated_by=? WHERE id=?`,
          [...Object.values(values), by, id],
        );
      else {
        const all = {...scope, ...values, created_by: by};
        await conn.execute(
          `INSERT INTO ${section.table} (id,${Object.keys(all).join(',')}) VALUES (?,${Object.keys(all).map(() => '?').join(',')})`,
          [id, ...Object.values(all)],
        );
      }
    }
    const gone = [...known].filter(id => !kept.has(id));
    if (gone.length)
      await conn.execute(
        `UPDATE ${section.table} SET deleted_at=CURRENT_TIMESTAMP(3),updated_by=? WHERE deleted_at IS NULL AND id IN (${gone.map(() => '?').join(',')})`,
        [by, ...gone],
      );
  }

  /** The active proposal row of the application, created when missing. */
  private async proposalId(conn: Conn, applicationId: string, by: string | null) {
    const [rows] = await conn.execute<any[]>(
      `SELECT id FROM ${CRM.fapFinancingProposals} WHERE application_id=? AND is_active=1 FOR UPDATE`,
      [applicationId],
    );
    if (rows.length) return rows[0].id as string;
    const id = crypto.randomUUID();
    await conn.execute(
      `INSERT INTO ${CRM.fapFinancingProposals} (id,application_id,is_active,created_by) VALUES (?,?,1,?)`,
      [id, applicationId, by],
    );
    return id;
  }

  /**
   * Saves the sections present in `input`; sections that are not sent keep their stored rows.
   * financingProposal is the section 08 form state (facility proposed, terms columns, realization plan, document
   * requirements, notes); proposal is the summary the calculators use (with the equipment units).
   */
  async save(
    conn: Conn,
    applicationId: string,
    input: {
      projects?: any[];
      bankReferences?: any[];
      proposal?: any;
      financingProposal?: any;
      financingPurposeDetail?: string | string[] | null;
    },
    by: string | null,
  ) {
    if (input.projects) await this.saveRows(conn, PROJECTS, {application_id: applicationId}, input.projects, by);
    if (input.bankReferences)
      await this.saveRows(conn, BANKS, {application_id: applicationId}, input.bankReferences, by);

    if (input.proposal || input.financingProposal) {
      const proposalId = await this.proposalId(conn, applicationId, by);
      const values: Record<string, any> = {};
      if (input.proposal) {
        Object.assign(values, await this.encode(conn, PROPOSAL_FIELDS, input.proposal));
        if (values.down_payment_value !== null && values.financing_value !== null && values.down_payment_value > values.financing_value)
          throw bad('Down payment melebihi nilai pembiayaan.');
        const [timing] = values.payment_timing_id
          ? await conn.execute<any[]>(`SELECT timing_type FROM ${CRM.masterPaymentTimings} WHERE id=?`, [values.payment_timing_id])
          : [[]];
        values.estimated_monthly_installment = installment(
          {
            financingValue: values.financing_value || 0,
            downPaymentValue: values.down_payment_value || 0,
            interestRate: values.interest_rate || 0,
            tenorMonths: values.tenor_months,
          },
          (timing as any[])[0]?.timing_type === 'ADVANCE',
        );
        if (input.proposal.termsNotes !== undefined) values.proposal_notes = clean(input.proposal.termsNotes);
        await this.saveRows(conn, UNITS, {application_id: applicationId, proposal_id: proposalId}, input.proposal.units || [], by);
      }
      const fp = input.financingProposal;
      if (fp) {
        if (fp.facilityProposed?.financingValue !== undefined)
          values.financing_value_display = clean(fp.facilityProposed.financingValue);
        if (fp.realizationPlan)
          for (const [k, c] of REALIZATION) values[c] = Math.max(0, Math.trunc(Number(fp.realizationPlan[k]) || 0));
        if (fp.notes !== undefined) values.proposal_notes = clean(fp.notes);
        if (fp.documentRequirements) await this.saveDocRequirements(conn, applicationId, fp.documentRequirements, by);
      }
      const cols = Object.keys(values);
      if (cols.length)
        await conn.execute(
          `UPDATE ${CRM.fapFinancingProposals} SET ${cols.map(c => `${c}=?`).join(',')},updated_by=? WHERE id=?`,
          [...Object.values(values), by, proposalId],
        );
    }
    if (input.financingPurposeDetail !== undefined && input.financingPurposeDetail !== null)
      await this.savePurposes(conn, applicationId, input.financingPurposeDetail, by);
  }

  /** One row per document requirement of Master Data; keys of `checked` are requirement codes. */
  private async saveDocRequirements(conn: Conn, applicationId: string, checked: Record<string, any>, by: string | null) {
    const [masters] = await conn.execute<any[]>(`SELECT id,code FROM ${CRM.masterFapDocumentRequirements}`);
    for (const m of masters) {
      if (!(m.code in checked)) continue;
      await conn.execute(
        `INSERT INTO ${CRM.fapDocRequirements} (id,application_id,doc_requirement_id,is_checked,created_by) VALUES (?,?,?,?,?)
         ON DUPLICATE KEY UPDATE is_checked=VALUES(is_checked),updated_by=VALUES(created_by)`,
        [crypto.randomUUID(), applicationId, m.id, checked[m.code] ? 1 : 0, by],
      );
    }
  }

  /** One row per financing purpose option of Master Data; `selected` lists option codes. */
  private async savePurposes(conn: Conn, applicationId: string, selected: string | string[], by: string | null) {
    const codes = new Set(
      (Array.isArray(selected) ? selected : String(selected).split(','))
        .map(s => String(s).trim().toUpperCase())
        .filter(Boolean),
    );
    const [masters] = await conn.execute<any[]>(`SELECT id,code FROM ${CRM.masterFinancingPurposeOptions}`);
    for (const m of masters)
      await conn.execute(
        `INSERT INTO ${CRM.fapFinancingPurposes} (id,application_id,purpose_option_id,is_selected,created_by) VALUES (?,?,?,?,?)
         ON DUPLICATE KEY UPDATE is_selected=VALUES(is_selected),updated_by=VALUES(created_by)`,
        [crypto.randomUUID(), applicationId, m.id, codes.has(m.code) ? 1 : 0, by],
      );
  }

  /** Financing summary per application for the application list. */
  async financingSummary(): Promise<Map<string, {financingValue: number | null; tenorMonths: number | null; financingMethod: string | null}>> {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT p.application_id,p.financing_value,p.tenor_months,m.code AS method FROM ${CRM.fapFinancingProposals} p
       LEFT JOIN ${CRM.masterFinancingMethods} m ON m.id=p.financing_method_id WHERE p.is_active=1`,
    );
    return new Map(
      rows.map(r => [r.application_id, {financingValue: num(r.financing_value), tenorMonths: num(r.tenor_months), financingMethod: r.method ?? null}]),
    );
  }
}
