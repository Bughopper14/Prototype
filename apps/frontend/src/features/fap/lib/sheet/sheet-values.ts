/** The values shown in the FAP sheet, worked out from the application, customer, profile and master data. */
import type {useMasterData} from '@/shared/master-data';
import type {FapSheetPreviewProps} from '@/features/fap/lib/types';

export function buildSheetValues(props: FapSheetPreviewProps, master: ReturnType<typeof useMasterData>) {
  const raw = props.data || {};

  const app = props.application || {};

  const cust = props.customer || app.customer || {};

  const prof = props.profile || app.profile || {};

  const p = props.pic || app.pic || raw.pic || {};

  const sh = props.stakeholders || app.stakeholders || raw.stakeholders || [];

  const proj = props.projects || (raw as any).projects || (app as any).projects || [];

  const isOcrSide = props.diffSide === 'ocr';

  const pick = (vA: any, vB: any, vC?: any, fallback = '') => {
    if (isOcrSide) {
      // On OCR side, strictly use vA (the OCR extracted value). Do not fall back to system data (vB, vC).
      if (vA !== undefined && vA !== null) return vA;
      return fallback;
    }
    if (vA !== undefined && vA !== null && vA !== '') return vA;
    if (vB !== undefined && vB !== null && vB !== '') return vB;
    if (vC !== undefined && vC !== null && vC !== '') return vC;
    return fallback;
  };

  const resolveLoc = (grp: 'province' | 'city' | 'district' | 'village', val: any) => {
    if (!val) return '';
    const str = String(val).trim();
    const items = (master as any)?.[grp] || [];
    const found = items.find((x: any) => x.value === str || x.name.toLowerCase() === str.toLowerCase());
    if (found) return found.name;
    if (/^[0-9a-f-]{32,36}$/i.test(str)) return '';
    return str;
  };

  const formatDate = (val: any) => {
    if (!val) return '';
    try {
      const dt = new Date(val);
      if (isNaN(dt.getTime())) return String(val).slice(0, 10);
      const day = String(dt.getDate()).padStart(2, '0');
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const year = dt.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return String(val).slice(0, 10);
    }
  };

  return {
    fapNumber: isOcrSide ? raw.fapNumber || '' : pick(raw.fapNumber, app.fapNumber, '0006/AF/03/2026'),
    applicationDate: isOcrSide
      ? raw.applicationDate
        ? formatDate(raw.applicationDate)
        : ''
      : formatDate(pick(raw.applicationDate, app.applicationDate, new Date().toISOString())),
    branchCode: isOcrSide ? raw.branchCode || '' : pick(raw.branchCode, app.branchCode, 'JKT01'),
    customerStatus: isOcrSide
      ? (raw.customerStatus || raw.customerCategory || '').toUpperCase()
      : pick(
          raw.customerStatus || raw.customerCategory,
          app.customerCategory || app.customerStatus,
          cust.customerCategory || cust.customerStatus || prof.customerStatus,
          'NEW',
        ).toUpperCase(),
    companyType: pick(raw.companyType, cust.companyType, '').toUpperCase(),
    companyName: pick(raw.companyName, cust.companyName, ''),
    companyAddress: pick(raw.companyAddress, prof.companyAddress, ''),
    city: resolveLoc('city', pick(raw.city, prof.city, '')),
    province: resolveLoc('province', pick(raw.province, prof.province, '')),
    postalCode: pick(raw.postalCode, prof.postalCode, ''),
    mainBusiness: pick(raw.mainBusiness, prof.mainBusiness, ''),
    industrySegment:
      raw.industrySegment !== undefined && raw.industrySegment !== null
        ? raw.industrySegment
        : prof.industrySegment !== undefined && prof.industrySegment !== null
          ? prof.industrySegment
          : (props.application as any)?.industrySegment || '',
    businessRole:
      raw.businessRole !== undefined && raw.businessRole !== null
        ? raw.businessRole
        : prof.businessRole !== undefined && prof.businessRole !== null
          ? prof.businessRole
          : (props.application as any)?.businessRole || '',
    establishmentActNo: pick(raw.establishmentActNo, cust.establishmentActNo, ''),
    establishmentDate: formatDate(pick(raw.establishmentDate, cust.establishmentDate, '')),
    experienceYears: (() => {
      if (isOcrSide) {
        return raw.experienceYears != null ? raw.experienceYears : '';
      }
      const val = pick(raw.experienceYears, prof.experienceYears, '');
      if (val !== '' && val != null) return val;
      const eDate = pick(raw.establishmentDate, cust.establishmentDate, '');
      if (!eDate) return '';
      const parts = String(eDate).slice(0, 10).split('-').map(Number);
      if (parts.length === 3 && parts[0] > 1900) {
        const dob = new Date(parts[0], parts[1] - 1, parts[2]);
        const today = new Date();
        let y = today.getFullYear() - dob.getFullYear();
        let m = today.getMonth() - dob.getMonth();
        if (today.getDate() < dob.getDate()) m--;
        if (m < 0) {
          y--;
          m += 12;
        }
        return Math.max(0, y);
      }
      return '';
    })(),
    experienceMonths: (() => {
      if (isOcrSide) {
        return raw.experienceMonths != null ? raw.experienceMonths : '';
      }
      const val = pick(raw.experienceMonths, prof.experienceMonths, '');
      if (val !== '' && val != null) return val;
      const eDate = pick(raw.establishmentDate, cust.establishmentDate, '');
      if (!eDate) return '';
      const parts = String(eDate).slice(0, 10).split('-').map(Number);
      if (parts.length === 3 && parts[0] > 1900) {
        const dob = new Date(parts[0], parts[1] - 1, parts[2]);
        const today = new Date();
        let y = today.getFullYear() - dob.getFullYear();
        let m = today.getMonth() - dob.getMonth();
        if (today.getDate() < dob.getDate()) m--;
        if (m < 0) {
          y--;
          m += 12;
        }
        return Math.max(0, m);
      }
      return '';
    })(),
    latestDeedNo: pick(raw.latestDeedNo, prof.latestDeedNo, ''),
    latestDeedDate: formatDate(pick(raw.latestDeedDate, prof.latestDeedDate, '')),
    nib: pick(raw.nib, cust.nib, ''),
    npwp: pick(raw.npwp, cust.npwp, ''),
    phoneFax: pick(raw.phoneFax, prof.phoneFax, ''),
    website: pick(raw.website, prof.website, ''),
    email: pick(raw.email, prof.email, ''),
    repaymentSource: pick(raw.repaymentSource, prof.repaymentSource, ''),
    locationStatus: pick(raw.locationStatus, prof.locationStatus, ''),
    picName: pick(raw.picName, p.picName, p.name, ''),
    position: pick(raw.position, p.position, ''),
    phone: pick(raw.phone, p.phone, p.mobilePhone, ''),
    picEmail: pick(raw.picEmail, p.email, ''),
    currentAddress: pick(raw.currentAddress, p.currentAddress, ''),
    picCity: resolveLoc('city', pick(raw.picCity, p.city, '')),
    picProvince: resolveLoc('province', pick(raw.picProvince, p.province, '')),
    picPostalCode: pick(raw.picPostalCode, p.postalCode, ''),
    selectedDeedNo: pick(
      (raw as any).selectedDeedNo,
      (raw as any).latestDeedNo,
      (prof as any).latestDeedNo,
      '',
    ),
    financingPurposeDetail: pick(
      (raw as any).financingPurposeDetail,
      (prof as any).financingPurposeDetail,
      (app as any).financingPurposeDetail,
      '',
    ),
    facilityPurpose: pick((raw as any).facilityPurpose, (app as any).facilityPurpose, 'INVESTMENT'),
    assetSummaryHeLiuGong:
      Number(
        pick(
          (raw as any).assetSummaryHeLiuGong,
          (prof as any).assetSummaryHeLiuGong,
          (app as any).assetSummaryHeLiuGong,
          '0',
        ),
      ) || 0,
    assetSummaryTruckLiuGong:
      Number(
        pick(
          (raw as any).assetSummaryTruckLiuGong,
          (prof as any).assetSummaryTruckLiuGong,
          (app as any).assetSummaryTruckLiuGong,
          '0',
        ),
      ) || 0,
    assetSummaryHeNonLiuGong:
      Number(
        pick(
          (raw as any).assetSummaryHeNonLiuGong,
          (prof as any).assetSummaryHeNonLiuGong,
          (app as any).assetSummaryHeNonLiuGong,
          '0',
        ),
      ) || 0,
    assetSummaryTruckNonLiuGong:
      Number(
        pick(
          (raw as any).assetSummaryTruckNonLiuGong,
          (prof as any).assetSummaryTruckNonLiuGong,
          (app as any).assetSummaryTruckNonLiuGong,
          '0',
        ),
      ) || 0,
    stakeholders: isOcrSide ? raw.stakeholders || [] : sh,
    projects: isOcrSide ? (raw as any).projects || [] : proj,
    bankReferences: isOcrSide
      ? (raw as any).bankReferences || []
      : props.data?.bankReferences ||
        (props.application as any)?.bankReferences ||
        (raw as any).bankReferences ||
        [],
    referenceComments: pick(
      (raw as any).referenceComments,
      (props.profile as any)?.referenceComments,
      (props.application as any)?.referenceComments,
      '',
    ),
    financingProposal: isOcrSide
      ? (raw as any).financingProposal || {}
      : (raw as any).financingProposal ||
        (props.application as any)?.financingProposal ||
        (props.profile as any)?.financingProposal ||
        {},
    financialAudited: Boolean(
      (raw as any).financialAudited ??
      (props.profile as any)?.financialAudited ??
      (props.application as any)?.financialAudited,
    ),
    financialStatements: isOcrSide
      ? (raw as any).financialStatements || []
      : props.data?.financialStatements ||
        (props.application as any)?.financialStatements ||
        (raw as any).financialStatements ||
        [],
    documentRequirements: isOcrSide
      ? (raw as any).documentRequirements || {}
      : (raw as any).documentRequirements || (raw as any).financingProposal?.documentRequirements || {},
  };
}

export type SheetValues = ReturnType<typeof buildSheetValues>;
