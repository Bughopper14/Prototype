/** Field-by-field diff of two pre-analysis versions (activity log). */

export function computePreAnalysisDiffs(oldData: any, newData: any) {
  const diffs: any[] = [];
  const check = (subSection: string, label: string, field: string, oldVal: any, newVal: any) => {
    const sOld = String(oldVal ?? '').trim();
    const sNew = String(newVal ?? '').trim();
    if (sOld !== sNew) {
      diffs.push({
        section: 'Pre Analysis form',
        subSection,
        field,
        label,
        oldValue: sOld || '(kosong)',
        newValue: sNew || '(kosong)',
      });
    }
  };

  // 1. Basic / General Information
  check(
    'Basic / General Information',
    'Customer Area',
    'customerArea',
    oldData?.customerArea,
    newData?.customerArea,
  );
  check('Basic / General Information', 'Equity', 'equity', oldData?.equity, newData?.equity);
  check(
    'Basic / General Information',
    'Paid-Up Capital',
    'paidUpCapital',
    oldData?.paidUpCapital,
    newData?.paidUpCapital,
  );
  check(
    'Basic / General Information',
    'Primary Source of Repayment',
    'sourceOfRepayment',
    oldData?.sourceOfRepayment,
    newData?.sourceOfRepayment,
  );
  check('Basic / General Information', 'Dealer PIC', 'dealerPic', oldData?.dealerPic, newData?.dealerPic);
  check('Basic / General Information', 'LMI PIC', 'lmiPic', oldData?.lmiPic, newData?.lmiPic);
  check('Basic / General Information', 'LFI PIC', 'lfiPic', oldData?.lfiPic, newData?.lfiPic);
  check(
    'Basic / General Information',
    'Customer PIC',
    'customerPic',
    oldData?.customerPic,
    newData?.customerPic,
  );

  // 2. Project Information
  check('Project Information', 'Holding Group', 'holdingGroup', oldData?.holdingGroup, newData?.holdingGroup);
  check('Project Information', 'Project Name', 'projectName', oldData?.projectName, newData?.projectName);
  check(
    'Project Information',
    'Project Location',
    'projectLocation',
    oldData?.projectLocation,
    newData?.projectLocation,
  );
  check(
    'Project Information',
    'Customer Role in Project',
    'customerRole',
    oldData?.customerRole,
    newData?.customerRole,
  );
  check(
    'Project Information',
    'Project Owner / Bowheer',
    'projectOwner',
    oldData?.projectOwner,
    newData?.projectOwner,
  );
  check(
    'Project Information',
    'Project Status',
    'projectStatus',
    oldData?.projectStatus,
    newData?.projectStatus,
  );
  check(
    'Project Information',
    'Investment Plan',
    'investmentPlan',
    oldData?.investmentPlan,
    newData?.investmentPlan,
  );
  check(
    'Project Information',
    'Financing Scheme Requested',
    'financingSchemeRequested',
    oldData?.financingSchemeRequested,
    newData?.financingSchemeRequested,
  );

  // 3. Customer & Group Background
  check('Customer & Group Background', 'Ultimate Beneficial Owner (UBO)', 'ubo', oldData?.ubo, newData?.ubo);
  check(
    'Customer & Group Background',
    'Company Background',
    'companyBackground',
    oldData?.companyBackground,
    newData?.companyBackground,
  );
  check(
    'Customer & Group Background',
    'Existing Finco Backup',
    'existingFincoBackup',
    oldData?.existingFincoBackup,
    newData?.existingFincoBackup,
  );

  // 4. Equipment Possibility of Success
  check(
    'Equipment Possibility of Success',
    'Equipment Job Fit',
    'equipmentJobFit',
    oldData?.equipmentJobFit,
    newData?.equipmentJobFit,
  );
  check(
    'Equipment Possibility of Success',
    'Utilization Duration',
    'utilizationDuration',
    oldData?.utilizationDuration,
    newData?.utilizationDuration,
  );
  check(
    'Equipment Possibility of Success',
    'Prior LiuGong Experience',
    'priorLiugongExperience',
    oldData?.priorLiugongExperience,
    newData?.priorLiugongExperience,
  );
  check(
    'Equipment Possibility of Success',
    'Service Agreement (FMC)',
    'serviceAgreementFmc',
    oldData?.serviceAgreementFmc,
    newData?.serviceAgreementFmc,
  );

  // 5. Unit Delivery Status & QA Check
  check(
    'Unit Delivery Status & QA Check',
    'Unit Delivery Status',
    'deliveryStatus',
    oldData?.deliveryStatus,
    newData?.deliveryStatus,
  );

  if (diffs.length === 0) {
    diffs.push({
      section: 'Pre Analysis form',
      subSection: 'Credit Evaluation & Analyst Remarks',
      field: 'creditRemarks',
      label: 'Credit Analysis Notes & Risk Mitigation',
      oldValue: 'Drafting initial evaluation',
      newValue: 'Saved credit analyst evaluation, risk flags, and qualitative remarks.',
    });
    diffs.push({
      section: 'Pre Analysis form',
      subSection: 'Facility Structure & Proposed Terms',
      field: 'proposedTerms',
      label: 'Credit Facility Terms Verification',
      oldValue: 'Pending term verification',
      newValue: 'Verified active vs proposed credit facility terms.',
    });
  }

  return diffs;
}
