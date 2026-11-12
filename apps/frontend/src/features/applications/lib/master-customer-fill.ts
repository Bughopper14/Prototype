/** Helpers to hydrate or clear customer/profile/PIC fields from Master Customer. */
import {calculateAgeYearsMonths} from '@/shared/lib/format';
import {blank, customerFields, picFields} from '@liugong/shared';

export const MASTER_PROFILE_TEXT_KEYS = [
  'branchCode',
  'locationStatus',
  'companyAddress',
  'province',
  'city',
  'district',
  'village',
  'rt',
  'rw',
  'postalCode',
  'phoneFax',
  'email',
  'website',
  'mainBusiness',
  'latestDeedNo',
  'repaymentSource',
  'industrySegment',
  'businessRole',
] as const;

export function emptyCustomerRecord(): Record<string, any> {
  return {...blank(customerFields), companyType: ''};
}

export function sanitizeCustomerForDraft(customer: any): Record<string, any> {
  if (!customer) return emptyCustomerRecord();
  const npwpRaw = String(customer.npwp || '').replace(/\D/g, '');
  return {
    ...emptyCustomerRecord(),
    id: customer.id || '',
    companyName: customer.companyName || '',
    companyType: customer.companyType || '',
    nib: customer.nib || '',
    nibDate: customer.nibDate ? String(customer.nibDate).slice(0, 10) : '',
    npwp: /^0+$/.test(npwpRaw) ? '' : customer.npwp || '',
    establishmentActNo: customer.establishmentActNo || '',
    establishmentDate: customer.establishmentDate ? String(customer.establishmentDate).slice(0, 10) : '',
  };
}

export function applyMasterCustomerToDraft(customer: any, prevDraft: any) {
  const nextCustomer = sanitizeCustomerForDraft(customer);
  const profilePatch: Record<string, any> = {};
  for (const key of MASTER_PROFILE_TEXT_KEYS) {
    profilePatch[key] = customer?.[key] ?? '';
  }

  const estDate = nextCustomer.establishmentDate;
  const exp = estDate ? calculateAgeYearsMonths(estDate) : null;
  const masterYears = Number(customer?.experienceYears || 0);
  const masterMonths = Number(customer?.experienceMonths || 0);
  const hasStoredExp = Boolean(estDate || masterYears > 0 || masterMonths > 0);

  const lgHe = Number(customer?.assetSummaryHeLiuGong) || 0;
  const lgTruck = Number(customer?.assetSummaryTruckLiuGong) || 0;
  const nlgHe = Number(customer?.assetSummaryHeNonLiuGong) || 0;
  const nlgTruck = Number(customer?.assetSummaryTruckNonLiuGong) || 0;
  const hasAssetSummary = lgHe + lgTruck + nlgHe + nlgTruck > 0;

  const masterPic = customer?.pic
    ? Object.fromEntries(
        picFields.map(f => [
          f.key,
          customer.pic[f.key] !== undefined && customer.pic[f.key] !== null ? customer.pic[f.key] : '',
        ]),
      )
    : blank(picFields);

  return {
    ...prevDraft,
    ...profilePatch,
    latestDeedDate: customer?.latestDeedDate ? String(customer.latestDeedDate).slice(0, 10) : '',
    experienceYears: exp ? exp.years : hasStoredExp ? masterYears : '',
    experienceMonths: exp ? exp.months : hasStoredExp ? masterMonths : '',
    assetSummaryHeLiuGong: hasAssetSummary ? lgHe : '',
    assetSummaryTruckLiuGong: hasAssetSummary ? lgTruck : '',
    assetSummaryHeNonLiuGong: hasAssetSummary ? nlgHe : '',
    assetSummaryTruckNonLiuGong: hasAssetSummary ? nlgTruck : '',
    customerId: customer?.id || '',
    customerCategory: 'EXISTING',
    customerStatus: 'EXISTING',
    customer: nextCustomer,
    pic: masterPic,
  };
}

export function clearMasterCustomerFromDraft(prevDraft: any, category: string) {
  const clearedProfile: Record<string, any> = {};
  for (const key of MASTER_PROFILE_TEXT_KEYS) {
    clearedProfile[key] = '';
  }
  return {
    ...prevDraft,
    ...clearedProfile,
    latestDeedDate: '',
    experienceYears: '',
    experienceMonths: '',
    assetSummaryHeLiuGong: '',
    assetSummaryTruckLiuGong: '',
    assetSummaryHeNonLiuGong: '',
    assetSummaryTruckNonLiuGong: '',
    customerId: '',
    customerCategory: category,
    customerStatus: category,
    customer: emptyCustomerRecord(),
    pic: blank(picFields),
  };
}
