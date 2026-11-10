/** Live FAP sheet data built from the current draft (company, NPWP, address, units…). */
import {useMasterData} from '@/shared/master-data';
import {type FapSheetData} from '@/features/fap/lib/types';
import {calculateAgeYearsMonths} from '@/shared/lib/format';

export function useLiveFapData({
  master,
  customerCategory,
  customerDraft,
  selectedCustomer,
  draft,
  a,
}: {
  master: ReturnType<typeof useMasterData>;
  customerCategory: string;
  customerDraft: any;
  selectedCustomer: any;
  draft: any;
  a: any;
}) {
  const liveCompanyName = String(
    draft.customer?.companyName ||
      customerDraft.companyName ||
      draft.companyName ||
      (customerCategory === 'EXISTING' ? selectedCustomer?.companyName : '') ||
      a.customer?.companyName ||
      a.companyName ||
      '',
  ).trim();

  const liveCompanyType = String(
    draft.customer?.companyType ||
      customerDraft.companyType ||
      draft.companyType ||
      (customerCategory === 'EXISTING' ? selectedCustomer?.companyType : '') ||
      a.customer?.companyType ||
      'CORPORATE',
  ).trim();

  const liveNib = String(
    draft.customer?.nib ||
      customerDraft.nib ||
      draft.nib ||
      (customerCategory === 'EXISTING' ? selectedCustomer?.nib : '') ||
      a.customer?.nib ||
      '',
  ).trim();

  const liveNpwp = (() => {
    const raw = String(
      draft.customer?.npwp ||
        customerDraft.npwp ||
        draft.npwp ||
        (customerCategory === 'EXISTING' ? selectedCustomer?.npwp : '') ||
        a.customer?.npwp ||
        '',
    ).trim();
    // If it contains only zeros (e.g. '000000000000000'), treat as empty
    return /^0+$/.test(raw) ? '' : raw;
  })();

  const liveEstablishmentActNo = String(
    draft.customer?.establishmentActNo ||
      customerDraft.establishmentActNo ||
      draft.establishmentActNo ||
      (customerCategory === 'EXISTING' ? selectedCustomer?.establishmentActNo : '') ||
      a.customer?.establishmentActNo ||
      '',
  ).trim();

  const liveEstablishmentDate = String(
    draft.customer?.establishmentDate ||
      customerDraft.establishmentDate ||
      draft.establishmentDate ||
      (customerCategory === 'EXISTING' ? selectedCustomer?.establishmentDate : '') ||
      a.customer?.establishmentDate ||
      '',
  ).trim();

  const liveNibDate = String(
    draft.customer?.nibDate ||
      customerDraft.nibDate ||
      draft.nibDate ||
      (customerCategory === 'EXISTING' ? selectedCustomer?.nibDate : '') ||
      a.customer?.nibDate ||
      '',
  ).trim();

  const liveDetailFapData: FapSheetData = {
    fapNumber: draft.isNew ? 'Auto (Generated on save)' : draft.fapNumber || a.fapNumber || '—',
    applicationDate: draft.applicationDate || a.applicationDate || new Date().toISOString(),
    branchCode: draft.branchCode || a.branchCode || '',
    customerStatus: customerCategory || draft.customerStatus || a.customerStatus || 'EXISTING',
    companyName: liveCompanyName,
    companyType: liveCompanyType,
    nib: liveNib,
    nibDate: liveNibDate || '',
    npwp: liveNpwp,
    establishmentActNo: liveEstablishmentActNo,
    establishmentDate: liveEstablishmentDate || '',
    companyAddress: draft.companyAddress,
    province:
      master.province?.find(
        x =>
          x.value === draft.province || x.name.toLowerCase() === String(draft.province || '').toLowerCase(),
      )?.name || draft.province,
    city:
      master.city?.find(
        x => x.value === draft.city || x.name.toLowerCase() === String(draft.city || '').toLowerCase(),
      )?.name || draft.city,
    district:
      master.district?.find(
        x =>
          x.value === draft.district || x.name.toLowerCase() === String(draft.district || '').toLowerCase(),
      )?.name || (/^[0-9a-f-]{36}$/i.test(String(draft.district || '')) ? '' : draft.district),
    village:
      master.village?.find(
        x => x.value === draft.village || x.name.toLowerCase() === String(draft.village || '').toLowerCase(),
      )?.name || (/^[0-9a-f-]{36}$/i.test(String(draft.village || '')) ? '' : draft.village),
    rt: draft.rt,
    rw: draft.rw,
    postalCode: draft.postalCode,
    mainBusiness: draft.mainBusiness,
    experienceYears:
      draft.experienceYears != null && draft.experienceYears !== ''
        ? draft.experienceYears
        : liveEstablishmentDate
          ? calculateAgeYearsMonths(liveEstablishmentDate).years
          : '',
    experienceMonths:
      draft.experienceMonths != null && draft.experienceMonths !== ''
        ? draft.experienceMonths
        : liveEstablishmentDate
          ? calculateAgeYearsMonths(liveEstablishmentDate).months
          : '',
    latestDeedNo: draft.latestDeedNo,
    latestDeedDate: draft.latestDeedDate,
    phoneFax: draft.phoneFax,
    website: draft.website,
    email: draft.email,
    repaymentSource: draft.repaymentSource,
    locationStatus: draft.locationStatus,
    industrySegment: draft.industrySegment || a.industrySegment,
    pic: draft.pic || a.pic,
    picName: draft.pic?.picName || draft.pic?.name || a.pic?.picName || a.pic?.name || a.picName || '',
    position: draft.pic?.position || a.pic?.position || a.position || '',
    phone: draft.pic?.phone || draft.pic?.mobilePhone || a.pic?.phone || a.phone || '',
    picEmail: draft.pic?.email || draft.pic?.picEmail || a.pic?.email || a.picEmail || '',
    currentAddress:
      draft.pic?.currentAddress || draft.pic?.address || a.pic?.currentAddress || a.currentAddress || '',
    picCity:
      master.city?.find(
        x =>
          x.value === (draft.pic?.city || a.pic?.city) ||
          x.name?.toLowerCase() === String(draft.pic?.city || a.pic?.city || '').toLowerCase(),
      )?.name ||
      draft.pic?.city ||
      a.pic?.city ||
      '',
    picProvince:
      master.province?.find(
        x =>
          x.value === (draft.pic?.province || a.pic?.province) ||
          x.name?.toLowerCase() === String(draft.pic?.province || a.pic?.province || '').toLowerCase(),
      )?.name ||
      draft.pic?.province ||
      a.pic?.province ||
      '',
    picPostalCode: draft.pic?.postalCode || a.pic?.postalCode || a.picPostalCode || '',
    selectedDeedNo: draft.legal?.selectedDeedNo || draft.latestDeedNo || a.customer?.establishmentActNo,
    financingPurposeDetail: draft.financingPurposeDetail !== undefined ? draft.financingPurposeDetail : a.financingPurposeDetail,
    businessRole: draft.businessRole || a.businessRole,
    proposal: draft.proposal || a.proposal,
    financingProposal: draft.financingProposal || draft.proposal || a.financingProposal || a.proposal,
    projects: draft.projects || a.projects,
    bankReferences: draft.bankReferences || a.bankReferences,
    referenceComments: draft.referenceComments !== undefined ? draft.referenceComments : a.referenceComments,
    financialStatements: draft.financialStatements || a.financialStatements,
    financialAudited: draft.financialAudited !== undefined ? draft.financialAudited : a.financialAudited,
    documentRequirements:
      draft.documentRequirements ||
      draft.financingProposal?.documentRequirements ||
      a.financingProposal?.documentRequirements ||
      (draft.proposal || a.proposal)?.documentRequirements,
    facilityPurpose:
      draft.facilityPurpose ||
      (draft.proposal || a.proposal)?.facilityPurpose ||
      a.facilityPurpose ||
      'INVESTMENT',
    financingMethod: (draft.proposal || a.proposal)?.financingMethod,
    financingValue: (draft.proposal || a.proposal)?.financingValue,
    downPaymentValue: (draft.proposal || a.proposal)?.downPaymentValue,
    interestRate: (draft.proposal || a.proposal)?.interestRate,
    tenorMonths: (draft.proposal || a.proposal)?.tenorMonths,
    paymentMethod: (draft.proposal || a.proposal)?.paymentMethod,
    units: (draft.proposal || a.proposal)?.units,
    assetSummaryHeLiuGong:
      draft.assetSummaryHeLiuGong !== undefined ? draft.assetSummaryHeLiuGong : a.assetSummaryHeLiuGong,
    assetSummaryTruckLiuGong:
      draft.assetSummaryTruckLiuGong !== undefined ? draft.assetSummaryTruckLiuGong : a.assetSummaryTruckLiuGong,
    assetSummaryHeNonLiuGong:
      draft.assetSummaryHeNonLiuGong !== undefined ? draft.assetSummaryHeNonLiuGong : a.assetSummaryHeNonLiuGong,
    assetSummaryTruckNonLiuGong:
      draft.assetSummaryTruckNonLiuGong !== undefined
        ? draft.assetSummaryTruckNonLiuGong
        : a.assetSummaryTruckNonLiuGong,
  };

  return {
    liveCompanyName,
    liveCompanyType,
    liveNib,
    liveNpwp,
    liveEstablishmentActNo,
    liveEstablishmentDate,
    liveNibDate,
    liveDetailFapData,
  };
}
