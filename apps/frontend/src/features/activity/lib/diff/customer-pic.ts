/** Changes found in: Customer & PIC (FAP form sections 01-05). */
import type {DiffContext} from '@/features/activity/lib/diff/types';
import {cleanVal} from '@/features/activity/lib/diff/format';

export function diffCustomerPic({
  beforeApp,
  draft,
  customerPayload,
  customerDraft,
  resolvedName,
  customerCategory,
  changes,
}: DiffContext) {
  const oldCust = beforeApp.customer || {};
  const oldPic = beforeApp.pic || {};
  const newCust = {...(draft.customer || {}), ...(customerDraft || {}), ...(customerPayload || {})};
  const newPic = {...(draft.pic || {}), ...(draft.contact || {})};

  const checkField = (subSection: string, label: string, field: string, oldVal: any, newVal: any) => {
    const sOld = cleanVal(oldVal);
    const sNew = cleanVal(newVal);
    if (sOld !== sNew) {
      changes.push({
        section: 'Customer & PIC',
        subSection,
        field,
        label,
        oldValue: sOld || '(kosong)',
        newValue: sNew || '(kosong)',
      });
    }
  };

  // 01: Debtor Identity & Classification
  if (customerCategory) {
    checkField(
      'Debtor Identity & Classification',
      'Customer Category',
      'customerStatus',
      beforeApp.customerStatus || beforeApp.customerCategory,
      customerCategory,
    );
  }
  checkField(
    'Debtor Identity & Classification',
    'Company Name',
    'companyName',
    oldCust.companyName || beforeApp.companyName,
    resolvedName || newCust.companyName,
  );
  checkField(
    'Debtor Identity & Classification',
    'Company Type',
    'companyType',
    oldCust.companyType || beforeApp.companyType,
    newCust.companyType || draft.companyType,
  );
  checkField(
    'Debtor Identity & Classification',
    'NIB',
    'nib',
    oldCust.nib || beforeApp.nib,
    newCust.nib || draft.nib,
  );
  checkField(
    'Debtor Identity & Classification',
    'Tax ID (NPWP)',
    'npwp',
    oldCust.npwp || beforeApp.npwp,
    newCust.npwp || draft.npwp,
  );
  checkField(
    'Debtor Identity & Classification',
    'NIB Registration Date',
    'nibDate',
    oldCust.nibDate || beforeApp.nibDate,
    newCust.nibDate || draft.nibDate,
  );

  // 02: Registration Office & Company Domicile
  checkField(
    'Registration Office & Company Domicile',
    'Application Branch',
    'branchCode',
    beforeApp.branchCode,
    draft.branchCode,
  );
  checkField(
    'Registration Office & Company Domicile',
    'Premises Ownership',
    'locationStatus',
    beforeApp.locationStatus,
    draft.locationStatus,
  );
  checkField(
    'Registration Office & Company Domicile',
    'Company Address',
    'companyAddress',
    oldCust.companyAddress || beforeApp.companyAddress,
    newCust.companyAddress || draft.companyAddress,
  );
  checkField(
    'Registration Office & Company Domicile',
    'Province',
    'province',
    oldCust.province || beforeApp.province,
    newCust.province || draft.province,
  );
  checkField(
    'Registration Office & Company Domicile',
    'City / Regency',
    'city',
    oldCust.city || beforeApp.city,
    newCust.city || draft.city,
  );
  checkField(
    'Registration Office & Company Domicile',
    'District (Kecamatan)',
    'district',
    oldCust.district || beforeApp.district,
    newCust.district || draft.district,
  );
  checkField(
    'Registration Office & Company Domicile',
    'Village (Kelurahan)',
    'village',
    oldCust.village || beforeApp.village,
    newCust.village || draft.village,
  );
  checkField(
    'Registration Office & Company Domicile',
    'RT',
    'rt',
    oldCust.rt || beforeApp.rt,
    newCust.rt || draft.rt,
  );
  checkField(
    'Registration Office & Company Domicile',
    'RW',
    'rw',
    oldCust.rw || beforeApp.rw,
    newCust.rw || draft.rw,
  );
  checkField(
    'Registration Office & Company Domicile',
    'Postal Code',
    'postalCode',
    oldCust.postalCode || beforeApp.postalCode,
    newCust.postalCode || draft.postalCode,
  );
  checkField(
    'Registration Office & Company Domicile',
    'Office Phone / Fax',
    'phoneFax',
    oldCust.phoneFax || beforeApp.phoneFax,
    newCust.phoneFax || draft.phoneFax,
  );
  checkField(
    'Registration Office & Company Domicile',
    'Company Email',
    'email',
    oldCust.email || beforeApp.email,
    newCust.email || draft.email,
  );
  checkField(
    'Registration Office & Company Domicile',
    'Company Website',
    'website',
    oldCust.website || beforeApp.website,
    newCust.website || draft.website,
  );

  // 03: Business Profile & Deed Legality
  checkField(
    'Business Profile & Deed Legality',
    'Main Business Sector',
    'mainBusiness',
    beforeApp.mainBusiness,
    draft.mainBusiness,
  );
  checkField(
    'Business Profile & Deed Legality',
    'Operating Experience (Years)',
    'experienceYears',
    beforeApp.experienceYears,
    draft.experienceYears,
  );
  checkField(
    'Business Profile & Deed Legality',
    'Operating Experience (Months)',
    'experienceMonths',
    beforeApp.experienceMonths,
    draft.experienceMonths,
  );
  checkField(
    'Business Profile & Deed Legality',
    'Primary Source of Repayment',
    'repaymentSource',
    beforeApp.repaymentSource,
    draft.repaymentSource,
  );
  checkField(
    'Business Profile & Deed Legality',
    'Establishment Deed No.',
    'establishmentActNo',
    oldCust.establishmentActNo || beforeApp.establishmentActNo,
    newCust.establishmentActNo || draft.establishmentActNo,
  );
  checkField(
    'Business Profile & Deed Legality',
    'Establishment Deed Date',
    'establishmentDate',
    oldCust.establishmentDate || beforeApp.establishmentDate,
    newCust.establishmentDate || draft.establishmentDate,
  );
  checkField(
    'Business Profile & Deed Legality',
    'Latest Amendment Deed No.',
    'latestDeedNo',
    beforeApp.latestDeedNo,
    draft.latestDeedNo,
  );
  checkField(
    'Business Profile & Deed Legality',
    'Latest Amendment Deed Date',
    'latestDeedDate',
    beforeApp.latestDeedDate,
    draft.latestDeedDate,
  );

  // 04: Primary Contact / Person in Charge (PIC)
  checkField(
    'Primary Contact / Person in Charge (PIC)',
    'PIC Full Name',
    'picName',
    oldPic.name || oldPic.picName || oldPic.contactName,
    newPic.name || newPic.picName || newPic.contactName,
  );
  checkField(
    'Primary Contact / Person in Charge (PIC)',
    'PIC Position / Title',
    'picPosition',
    oldPic.position || oldPic.picPosition,
    newPic.position || newPic.picPosition,
  );
  checkField(
    'Primary Contact / Person in Charge (PIC)',
    'PIC Mobile Phone',
    'picPhone',
    oldPic.phone || oldPic.mobilePhone || oldPic.mobile || oldPic.picMobile,
    newPic.phone || newPic.mobilePhone || newPic.mobile || newPic.picMobile,
  );
  checkField(
    'Primary Contact / Person in Charge (PIC)',
    'PIC Email Address',
    'picEmail',
    oldPic.email || oldPic.picEmail,
    newPic.email || newPic.picEmail,
  );
  checkField(
    'Primary Contact / Person in Charge (PIC)',
    'PIC Domicile Address',
    'picAddress',
    oldPic.currentAddress || oldPic.address,
    newPic.currentAddress || newPic.address,
  );
  checkField(
    'Primary Contact / Person in Charge (PIC)',
    'PIC Identity Card (KTP/KITAS)',
    'picIdCard',
    oldPic.idCard || oldPic.picIdCard || oldPic.idNumber,
    newPic.idCard || newPic.picIdCard || newPic.idNumber,
  );

  // 05: Industry Segmentation & Active Projects
  checkField(
    'Industry Segmentation & Active Projects',
    'Industry Segment',
    'industrySegment',
    beforeApp.industrySegment,
    draft.industrySegment,
  );
  checkField(
    'Industry Segmentation & Active Projects',
    'Business Role',
    'businessRole',
    beforeApp.businessRole,
    draft.businessRole,
  );
  if ((beforeApp.projects || []).length !== (draft.projects || []).length) {
    checkField(
      'Industry Segmentation & Active Projects',
      'Active Projects Count',
      'projects',
      `${(beforeApp.projects || []).length} proyek`,
      `${(draft.projects || []).length} proyek`,
    );
  }
}
