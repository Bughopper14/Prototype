import {experienceFromEstablishmentDate} from '@liugong/shared';

/** One difference between the system data and the signed FAP document; '' means the value is empty. */
export type FapDiff = {field: string; label: string; oldValue: string; newValue: string; section?: string};

/** Where the master form fields (crm_master_form_fields) name a field: its label and section. */
export type FieldRule = {label: string; section: string};
/** Finds the master rule of a field; `anchor` is a field that only exists in the wanted section (so a repeated key such as city picks the right one). */
export type RuleLookup = (key: string, anchor?: string) => FieldRule | undefined;

const text = (v: any) => (v !== undefined && v !== null ? String(v).trim() : '');

const toIsoDate = (val: string) => {
  const mIso = val.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (mIso) return `${mIso[1]}-${mIso[2].padStart(2, '0')}-${mIso[3].padStart(2, '0')}`;
  const mDmy = val.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (mDmy) return `${mDmy[3]}-${mDmy[2].padStart(2, '0')}-${mDmy[1].padStart(2, '0')}`;
  return null;
};

/** True when the system value and the document value of one FAP field are not the same (after normalising). */
function differs(key: string, system: string, document: string, isNumber: boolean) {
  if (!system && !document) return false;
  if (isNumber) {
    if (key === 'experienceMonths' && ((system === '0' && !document) || (document === '0' && !system))) return false;
    if (!system || !document) return true;
    const a = Number(system.replace(/[^\d.-]/g, ''));
    const b = Number(document.replace(/[^\d.-]/g, ''));
    return !(!isNaN(a) && !isNaN(b) && a === b);
  }
  const upper = (s: string) => s.replace(/\s+/g, ' ').toUpperCase();
  if (upper(system) === upper(document)) return false;
  if (!system || !document) return true;
  const k = key.toLowerCase();
  const same = (norm: (s: string) => string | null) => {
    const a = norm(system);
    return !!a && a === norm(document);
  };
  if (k.includes('date') && same(toIsoDate)) return false;
  if ((key === 'nib' || key === 'npwp') && same(s => s.replace(/\D/g, ''))) return false;
  if (k.includes('phone')) {
    const a = system.replace(/\D/g, '');
    const b = document.replace(/\D/g, '');
    if (a && b && (a === b || a.endsWith(b) || b.endsWith(a))) return false;
  }
  if (k.includes('province') && same(s => upper(s).replace(/TIMU\b/g, 'TIMUR').trim())) return false;
  if (
    k.includes('address') &&
    same(s =>
      s
        .replace(/\bJ[I1L]\.?\s*/gi, 'JL. ')
        .replace(/TIMU\b/gi, 'TIMUR')
        .replace(/[\s,.-]+/g, ' ')
        .trim()
        .toUpperCase(),
    )
  )
    return false;
  if ((k.includes('deed') || k.includes('act')) && same(s => s.replace(/[\s\-_/.]/g, '').toUpperCase())) return false;
  if (k.includes('purpose')) {
    const purpose = (s: string) => {
      const u = s.toUpperCase();
      if (u.includes('INVEST')) return 'INVESTMENT';
      if (u.includes('MODAL') || u.includes('WORKING')) return 'WORKING-CAPITAL';
      return u;
    };
    if (same(purpose)) return false;
  }
  return true;
}

/** Business experience of the application: the stored years/months, otherwise counted from the establishment date. */
function experience(app: any) {
  const pick = (a: any, b: any) => (a !== undefined && a !== null && a !== '' ? a : b !== undefined && b !== null && b !== '' ? b : '');
  let years = pick(app.experienceYears, app.customer?.experienceYears);
  let months = pick(app.experienceMonths, app.customer?.experienceMonths);
  const established = app.establishmentDate || app.customer?.establishmentDate || app.legal?.establishmentDate;
  if (years === '' && established) {
    const e = experienceFromEstablishmentDate(established);
    years = e.experienceYears;
    months = e.experienceMonths;
  }
  return {years, months};
}

/**
 * The FAP fields printed on the signed document (RT / RW are not on the form): key, system value and whether the value is
 * a number. Province and city are compared by name. The label and section come from the master rule named by `rule`
 * (`anchor` picks the section when a key repeats); `label` is only used for a field the master has no rule for.
 */
const FIELDS: {key: string; label: string; rule?: string; anchor?: string; system: (app: any) => any; number?: boolean}[] = [
  {key: 'applicationDate', label: 'Tanggal / Application Date', system: a => a.applicationDate},
  {key: 'branchCode', rule: 'branchCode', anchor: 'companyAddress', label: 'Cabang / Branch Code', system: a => a.branchCode},
  {key: 'customerStatus', rule: 'customerCategory', label: 'Status Debitur (New / Existing)', system: a => a.customerStatus || a.customerCategory},
  {key: 'companyType', rule: 'companyType', label: 'Tipe Perusahaan / Segmen', system: a => a.customer?.companyType || a.companyType},
  {key: 'companyName', rule: 'companyName', label: 'Nama Perusahaan', system: a => a.customer?.companyName || a.companyName},
  {key: 'nib', rule: 'nib', label: 'Nomor Induk Berusaha (NIB)', system: a => a.customer?.nib || a.nib},
  {key: 'npwp', rule: 'npwp', label: 'NPWP Perusahaan', system: a => a.customer?.npwp || a.npwp},
  {key: 'companyAddress', rule: 'companyAddress', anchor: 'companyAddress', label: 'Alamat Perusahaan', system: a => a.companyAddress || a.customer?.companyAddress},
  {key: 'city', rule: 'city', anchor: 'companyAddress', label: 'Kota / Kabupaten', system: a => a.city || a.customer?.city},
  {key: 'province', rule: 'province', anchor: 'companyAddress', label: 'Provinsi', system: a => a.province || a.customer?.province},
  {key: 'postalCode', rule: 'postalCode', anchor: 'companyAddress', label: 'Kode Pos', system: a => a.postalCode || a.customer?.postalCode},
  {key: 'phoneFax', rule: 'phoneFax', label: 'Telepon / Fax', system: a => a.phoneFax},
  {key: 'email', rule: 'email', anchor: 'companyAddress', label: 'Email Perusahaan', system: a => a.email},
  {key: 'website', rule: 'website', label: 'Website Perusahaan', system: a => a.website},
  {key: 'mainBusiness', rule: 'mainBusiness', label: 'Bidang Usaha Utama', system: a => a.mainBusiness},
  {
    key: 'establishmentActNo',
    rule: 'establishmentActNo', label: 'Nomor Akta Pendirian',
    system: a => a.establishmentActNo || a.legal?.establishmentActNo,
  },
  {
    key: 'establishmentDate',
    rule: 'establishmentDate', label: 'Tanggal Akta Pendirian',
    system: a => a.establishmentDate || a.legal?.establishmentDate,
  },
  {key: 'experienceYears', rule: 'experienceYears', label: 'Pengalaman Usaha (Tahun)', system: a => experience(a).years, number: true},
  {key: 'experienceMonths', rule: 'experienceMonths', label: 'Pengalaman Usaha (Bulan)', system: a => experience(a).months, number: true},
  {key: 'latestDeedNo', rule: 'latestDeedNo', label: 'Nomor Akta Perubahan Terakhir', system: a => a.latestDeedNo || a.legal?.latestDeedNo},
  {
    key: 'latestDeedDate',
    rule: 'latestDeedDate', label: 'Tanggal Akta Perubahan Terakhir',
    system: a => a.latestDeedDate || a.legal?.latestDeedDate,
  },
  {key: 'repaymentSource', rule: 'repaymentSource', label: 'Sumber Pengembalian', system: a => a.repaymentSource},
  {key: 'locationStatus', rule: 'locationStatus', label: 'Status Lokasi Usaha', system: a => a.locationStatus},
  {key: 'picName', rule: 'picName', label: 'Nama PIC', system: a => a.pic?.picName || a.pic?.name},
  {key: 'picPosition', rule: 'position', anchor: 'picName', label: 'Jabatan PIC', system: a => a.pic?.position},
  {key: 'picPhone', rule: 'phone', anchor: 'picName', label: 'No. HP / Telepon PIC', system: a => a.pic?.phone || a.pic?.mobilePhone},
  {key: 'picEmail', rule: 'email', anchor: 'picName', label: 'Email PIC', system: a => a.pic?.email},
  {key: 'picAddress', rule: 'currentAddress', anchor: 'picName', label: 'Alamat Domisili PIC', system: a => a.pic?.currentAddress || a.pic?.address},
  {key: 'picCity', rule: 'city', anchor: 'picName', label: 'Kota PIC', system: a => a.pic?.city},
  {key: 'picProvince', rule: 'province', anchor: 'picName', label: 'Provinsi PIC', system: a => a.pic?.province},
  {key: 'picPostalCode', rule: 'postalCode', anchor: 'picName', label: 'Kode Pos PIC', system: a => a.pic?.postalCode},
  {key: 'financingValue', rule: 'financingValueProp', label: 'Nilai Pembiayaan', system: a => a.proposal?.financingValue, number: true},
  {key: 'downPaymentValue', label: 'Uang Muka (DP)', system: a => a.proposal?.downPaymentValue, number: true},
  {key: 'tenorMonths', label: 'Tenor (Bulan)', system: a => a.proposal?.tenorMonths, number: true},
  {key: 'facilityPurpose', label: 'Tujuan Pembiayaan', system: a => a.proposal?.facilityPurpose || a.facilityPurpose},
  {key: 'financingMethod', rule: 'financingMethod', label: 'Metode Pembayaran', system: a => a.proposal?.financingMethod},
];

/**
 * Every FAP field whose value in the OCR result of the signed document differs from the application. A field the OCR
 * could not read (null / missing) is skipped; a field read as empty ('') is a difference.
 */
const withRule = (f: (typeof FIELDS)[number], rule: RuleLookup, diff: FapDiff): FapDiff => {
  const found = f.rule ? rule(f.rule, f.anchor) : undefined;
  return found ? {...diff, label: found.label, section: found.section} : diff;
};

export function computeFapDiffs(app: any, extracted: any, rule: RuleLookup): FapDiff[] {
  const diffs: FapDiff[] = [];
  for (const f of FIELDS) {
    if (extracted[f.key] === null || extracted[f.key] === undefined) continue;
    const system = text(f.system(app));
    const document = text(extracted[f.key]);
    if (differs(f.key, system, document, !!f.number))
      diffs.push(withRule(f, rule, {field: f.key, label: f.label, oldValue: system, newValue: document}));
  }
  return diffs;
}

/**
 * The stored differences that still exist against the current application data: a field drops out once the system
 * value equals the stored document value. The system value of the remaining ones is refreshed.
 */
export function recheckFapDiffs(app: any, stored: FapDiff[]): FapDiff[] {
  const byKey = new Map(FIELDS.map(f => [f.key, f]));
  const out: FapDiff[] = [];
  for (const d of stored) {
    const f = byKey.get(d.field);
    if (!f) continue;
    const system = text(f.system(app));
    if (differs(f.key, system, text(d.newValue), !!f.number)) out.push({...d, oldValue: system});
  }
  return out;
}
