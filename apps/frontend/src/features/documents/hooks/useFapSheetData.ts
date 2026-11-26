/**
 * FAP sheet data for the two panes: live from the application, and the signed FAP document. Only the fields where the
 * document differed are stored (comparison.documentValues); every other field of the document matched the system.
 */
import {useMasterData} from '@/shared/master-data';
import {type FapSheetData} from '@/features/fap/lib/types';
import {calculateAgeYearsMonths, deriveDeedSync} from '@/shared/lib/format';
import {extractStreetAddress, resolveFinancingMethodGroup} from '@liugong/shared';
import {useMemo} from 'react';

const street = (text: any, hints: any): string => (text ? extractStreetAddress(String(text), hints) || String(text) : '');

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
    // Deed number/date and shareholders come from the latest deed in Legal
    const syncDoc = deriveDeedSync(a.legal, a);
    const resolvedStakeholders =
      syncDoc.latestStakeholders.length > 0 ? syncDoc.latestStakeholders : a.stakeholders || [];
    const finalLatestDeedNo = syncDoc.latestDeedNo || a.latestDeedNo || '';
    const finalLatestDeedDate = String(syncDoc.latestDeedDate || a.latestDeedDate || '').slice(0, 10);

    return {
      fapNumber: a.fapNumber || '-',
      applicationDate: a.applicationDate || new Date().toISOString(),
      branchCode: a.branchCode || a.profile?.branchCode || '',
      customerStatus: a.customerCategory || a.customerStatus || a.profile?.customerStatus || '',
      companyName: a.customer?.companyName || a.companyName || '',
      companyType: a.customer?.companyType || a.companyType || '',
      nib: a.customer?.nib || a.nib || '',
      nibDate: a.customer?.nibDate || a.nibDate || '',
      npwp: a.customer?.npwp || a.npwp || '',
      establishmentActNo: a.customer?.establishmentActNo || a.establishmentActNo || '',
      establishmentDate: a.customer?.establishmentDate || a.establishmentDate || '',
      // the database keeps the full address; the sheet shows the street part
      companyAddress: street(a.customer?.companyAddress || a.companyAddress, a.customer || a),
      city: a.customer?.city || a.city || '',
      province: a.customer?.province || a.province || '',
      postalCode: a.customer?.postalCode || a.postalCode || '',
      experienceYears: finalExpYears,
      experienceMonths: finalExpMonths,
      mainBusiness: a.mainBusiness || a.customer?.mainBusiness || '',
      latestDeedNo: finalLatestDeedNo,
      latestDeedDate: finalLatestDeedDate,
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
      currentAddress: street(docPic.currentAddress || docPic.address || a.currentAddress, docPic),
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
      selectedDeedNo: finalLatestDeedNo || a.selectedDeedNo || a.customer?.establishmentActNo || '',
      stakeholders: resolvedStakeholders,
      facilityPurpose: a.proposal?.facilityPurpose || a.facilityPurpose || '',
      financingMethod: a.proposal?.financingMethod || a.financingMethod || '',
      financingValue: a.proposal?.financingValue || a.financingValue || '',
      downPaymentValue: a.proposal?.downPaymentValue || a.downPaymentValue || '',
      interestRate: a.proposal?.interestRate || a.interestRate || '',
      tenorMonths: a.proposal?.tenorMonths || a.tenorMonths || '',
      paymentMethod: a.proposal?.paymentMethod || a.paymentMethod || '',
      industrySegment: a.industrySegment || a.industry_segment || '',
      businessRole: a.businessRole || a.business_role || '',
      proposal: a.proposal || {},
      projects: a.projects || [],
      bankReferences: a.bankReferences || [],
      financialStatements: a.financialStatements || [],
    };
  }, [a, master]);

  const ocrFapData: FapSheetData = useMemo(() => {
    const ext: any = fapComparison
      ? {
          ...liveFapData,
          picPosition: liveFapData.position,
          picPhone: liveFapData.phone,
          picAddress: liveFapData.currentAddress,
          stakeholders: [],
          shareholders: [],
          selectedDeedNo: '',
          selectedDeedDate: '',
          ...(fapComparison.documentValues || {}),
        }
      : {};
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
      latestDeedNo: ext.latestDeedNo || ext.selectedDeedNo || '',
      latestDeedDate: ext.latestDeedDate || ext.selectedDeedDate || '',
      selectedDeedNo: ext.latestDeedNo || ext.selectedDeedNo || '',
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
      picPosition: ext.picPosition || '',
      phone: ext.picPhone || '',
      picPhone: ext.picPhone || '',
      picEmail: ext.picEmail || '',
      currentAddress: ext.picAddress || ext.picCurrentAddress || '',
      picAddress: ext.picAddress || ext.picCurrentAddress || '',
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
      applicationSource: ext.applicationSource || '',
      currency: ext.currency || '',
      stakeholders: (() => {
        if (!fapComparison) return [];
        const docSh = fapComparison.documentValues?.stakeholders ?? fapComparison.extractedData?.stakeholders;
        if (!docSh || docSh === '— (Kosong di dokumen)' || docSh === '-' || docSh === '[]') return [];
        if (Array.isArray(docSh)) return docSh;
        if (typeof docSh === 'string') {
          try {
            const parsed = JSON.parse(docSh);
            if (Array.isArray(parsed)) return parsed;
          } catch {
            // Backend stores formatted comma-separated names like "Name A (60%), Name B (40%)"
            return docSh
              .split(',')
              .map(part => part.trim())
              .filter(Boolean)
              .map(part => {
                const m = part.match(/^(.+?)\s*\((\d+(?:[.,]\d+)?)%?\)$/);
                return m ? {name: m[1].trim(), sharePercentage: m[2]} : {name: part};
              });
          }
        }
        return [];
      })(),
      projects: ext.projects || [],
      bankReferences: ext.bankReferences || [],
      financialStatements: ext.financialStatements || [],
      financingProposal: (() => {
        const rawMethod = String(ext.financingMethod || '').toUpperCase();
        const cleanMethod =
          rawMethod.includes('INSTALLMENT') || rawMethod.includes('PEMBELIAN') || rawMethod.includes('ANGSURAN')
            ? 'INSTALLMENT-FINANCING'
            : rawMethod.includes('FINANCIAL') || rawMethod.includes('SEWA')
              ? 'FINANCIAL-LEASE'
              : rawMethod.includes('SALE') || rawMethod.includes('SLB')
                ? 'SALE-AND-LEASE-BACK'
                : ext.financingMethod || '';
        const group = resolveFinancingMethodGroup(cleanMethod) || 'termsInstallmentFinancing';
        const curr = ext.currency || 'IDR';
        const isAdv = String(ext.paymentMethod || '').toUpperCase().includes('ADVANCE');
        const paymentVal = isAdv
          ? 'IN-ADVANCE'
          : String(ext.paymentMethod || '').toUpperCase().includes('ARREAR')
            ? 'IN-ARREAR'
            : ext.paymentMethod || '';
        const termObj = {
          workingCapitalInvestment: ext.facilityPurpose || '',
          currency: curr,
          downPayment: ext.downPaymentValue != null && ext.downPaymentValue !== '' && ext.downPaymentValue !== 0 ? ext.downPaymentValue : '',
          securityDeposit: ext.securityDeposit != null && ext.securityDeposit !== '' && ext.securityDeposit !== 0 ? ext.securityDeposit : '',
          interestRate: ext.interestRate != null && ext.interestRate !== '' && ext.interestRate !== 0 ? ext.interestRate : '',
          tenor: ext.tenorMonths != null && ext.tenorMonths !== '' && ext.tenorMonths !== 0 ? ext.tenorMonths : '',
          paymentMethod: paymentVal,
        };
        return {
          facilityProposed: {
            financingMethod: cleanMethod,
            financingValue: ext.financingValue != null && ext.financingValue !== '' && ext.financingValue !== 0 ? ext.financingValue : '',
            currencyChoice: curr,
            applicationSource: ext.applicationSource || '',
          },
          termsFinancialLease: group === 'termsFinancialLease' ? termObj : {},
          termsSaleAndLeaseBack: group === 'termsSaleAndLeaseBack' ? termObj : {},
          termsInstallmentFinancing: group === 'termsInstallmentFinancing' ? termObj : {},
        };
      })(),
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
  }, [fapComparison, liveFapData, a.fapNumber]);

  return {liveFapData, ocrFapData};
}
