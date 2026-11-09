/** FAP sheet data for the two panes: live from the application, and from the OCR of the uploaded FAP. */
import {useMasterData} from '@/shared/master-data';
import {type FapSheetData} from '@/features/fap/lib/types';
import {calculateAgeYearsMonths} from '@/shared/lib/format';
import {useMemo} from 'react';

export function useFapSheetData({
  fapComparison,
  master,
  a,
}: {
  fapComparison: any;
  master: ReturnType<typeof useMasterData>;
  a: any;
}) {
  const liveFapData: FapSheetData = useMemo(() => {
    const docPic = a.pic || a.customer?.pic || {};
    const estDate = a.customer?.establishmentDate || a.establishmentDate || '';
    const autoExp = estDate ? calculateAgeYearsMonths(estDate) : null;
    const finalExpYears =
      a.customer?.experienceYears != null && a.customer?.experienceYears !== ''
        ? a.customer.experienceYears
        : a.experienceYears != null && a.experienceYears !== ''
          ? a.experienceYears
          : autoExp
            ? autoExp.years
            : '';
    const finalExpMonths =
      a.customer?.experienceMonths != null && a.customer?.experienceMonths !== ''
        ? a.customer.experienceMonths
        : a.experienceMonths != null && a.experienceMonths !== ''
          ? a.experienceMonths
          : autoExp
            ? autoExp.months
            : '';

    return {
      fapNumber: a.fapNumber || '-',
      applicationDate: a.applicationDate || new Date().toISOString(),
      branchCode: a.branchCode || a.profile?.branchCode || '',
      customerStatus: a.customerCategory || a.profile?.customerStatus || 'EXISTING',
      companyName: a.customer?.companyName || a.companyName || '',
      companyType: a.customer?.companyType || a.companyType || 'PT',
      nib: a.customer?.nib || a.nib || '',
      nibDate: a.customer?.nibDate || a.nibDate || '',
      npwp: a.customer?.npwp || a.npwp || '',
      establishmentActNo: a.customer?.establishmentActNo || a.establishmentActNo || '',
      establishmentDate: a.customer?.establishmentDate || a.establishmentDate || '',
      companyAddress: a.customer?.companyAddress || a.companyAddress || '',
      city: a.customer?.city || a.city || '',
      province: a.customer?.province || a.province || '',
      postalCode: a.customer?.postalCode || a.postalCode || '',
      experienceYears: finalExpYears,
      experienceMonths: finalExpMonths,
      mainBusiness: a.mainBusiness || a.customer?.mainBusiness || '',
      latestDeedNo: a.latestDeedNo || '',
      latestDeedDate: a.latestDeedDate || '',
      phoneFax: a.phoneFax || '',
      website: a.website || '',
      email: a.email || '',
      repaymentSource: a.repaymentSource || '',
      locationStatus: a.locationStatus || '',
      pic: docPic,
      picName: docPic.picName || docPic.name || a.picName || '',
      position: docPic.position || a.position || '',
      phone: docPic.phone || docPic.mobilePhone || a.phone || '',
      picEmail: docPic.email || docPic.picEmail || a.picEmail || '',
      currentAddress: docPic.currentAddress || docPic.address || a.currentAddress || '',
      picCity:
        master.city?.find(
          x => x.value === docPic.city || x.name?.toLowerCase() === String(docPic.city || '').toLowerCase(),
        )?.name ||
        docPic.city ||
        a.picCity ||
        '',
      picProvince:
        master.province?.find(
          x =>
            x.value === docPic.province ||
            x.name?.toLowerCase() === String(docPic.province || '').toLowerCase(),
        )?.name ||
        docPic.province ||
        a.picProvince ||
        '',
      picPostalCode: docPic.postalCode || a.picPostalCode || '',
      selectedDeedNo: a.selectedDeedNo || a.customer?.establishmentActNo || '',
      stakeholders: a.stakeholders || [],
      facilityPurpose: a.proposal?.facilityPurpose || a.facilityPurpose || 'INVESTMENT',
      financingMethod: a.proposal?.financingMethod || a.financingMethod || '',
      financingValue: a.proposal?.financingValue || a.financingValue || '',
      downPaymentValue: a.proposal?.downPaymentValue || a.downPaymentValue || '',
      interestRate: a.proposal?.interestRate || a.interestRate || '',
      tenorMonths: a.proposal?.tenorMonths || a.tenorMonths || '',
      paymentMethod: a.proposal?.paymentMethod || a.paymentMethod || 'In Arrear',
      industrySegment: a.industrySegment || '',
      businessRole: a.businessRole || '',
      proposal: a.proposal || {},
      projects: a.projects || [],
      bankReferences: a.bankReferences || [],
      financialStatements: a.financialStatements || [],
    };
  }, [a, master]);

  const ocrFapData: FapSheetData = useMemo(() => {
    const ext = fapComparison?.extractedData || {};
    return {
      fapNumber: ext.fapNumber || a.fapNumber || '',
      applicationDate: ext.applicationDate || '',
      branchCode: ext.branchCode || '',
      customerStatus: ext.customerStatus || '',
      companyName: ext.companyName || '',
      companyType: ext.companyType || '',
      nib: ext.nib || '',
      nibDate: ext.nibDate || '',
      npwp: ext.npwp || '',
      establishmentActNo: ext.establishmentActNo || '',
      establishmentDate: ext.establishmentDate || '',
      latestDeedNo: ext.latestDeedNo || '',
      latestDeedDate: ext.latestDeedDate || '',
      companyAddress: ext.companyAddress || '',
      rt: ext.rt || '',
      rw: ext.rw || '',
      city: ext.city || '',
      province: ext.province || '',
      postalCode: ext.postalCode || '',
      phoneFax: ext.phoneFax || '',
      email: ext.email || '',
      website: ext.website || '',
      repaymentSource: ext.repaymentSource || '',
      locationStatus: ext.locationStatus || '',
      mainBusiness: ext.mainBusiness || '',
      experienceYears: ext.experienceYears != null ? ext.experienceYears : '',
      experienceMonths: ext.experienceMonths != null ? ext.experienceMonths : '',
      picName: ext.picName || '',
      position: ext.picPosition || '',
      phone: ext.picPhone || '',
      picEmail: ext.picEmail || '',
      currentAddress: ext.picAddress || ext.picCurrentAddress || '',
      picCity: ext.picCity || '',
      picProvince: ext.picProvince || '',
      picPostalCode: ext.picPostalCode || '',
      facilityPurpose: ext.facilityPurpose || '',
      financingMethod: ext.financingMethod || '',
      financingValue: ext.financingValue != null ? ext.financingValue : 0,
      downPaymentValue: ext.downPaymentValue != null ? ext.downPaymentValue : 0,
      interestRate: ext.interestRate != null ? ext.interestRate : 0,
      tenorMonths: ext.tenorMonths != null ? ext.tenorMonths : 0,
      paymentMethod: ext.paymentMethod || '',
      stakeholders: ext.stakeholders || [],
      projects: ext.projects || [],
      bankReferences: ext.bankReferences || [],
      financialStatements: ext.financialStatements || [],
      proposal: {
        facilityPurpose: ext.facilityPurpose || '',
        financingMethod: ext.financingMethod || '',
        financingValue: ext.financingValue != null ? ext.financingValue : 0,
        downPaymentValue: ext.downPaymentValue != null ? ext.downPaymentValue : 0,
        interestRate: ext.interestRate != null ? ext.interestRate : 0,
        tenorMonths: ext.tenorMonths != null ? ext.tenorMonths : 0,
        paymentMethod: ext.paymentMethod || '',
      },
    };
  }, [fapComparison, a.fapNumber]);

  return {liveFapData, ocrFapData};
}
