/** Maps a changed field to the form section / sub-section name shown in the feed. */

export function resolveSubSectionName(fieldKey: string, sectionName: string = ''): string {
  const k = (fieldKey || '').toLowerCase();
  const sec = (sectionName || '').toLowerCase();

  if (sec.includes('pre analysis')) {
    if (
      k.includes('project') ||
      k.includes('bowheer') ||
      k.includes('investment') ||
      k.includes('scheme') ||
      k.includes('contractor')
    ) {
      return 'Project Information';
    }
    if (
      k.includes('ubo') ||
      k.includes('group') ||
      k.includes('background') ||
      k.includes('milestone') ||
      k.includes('finco')
    ) {
      return 'Customer & Group Background';
    }
    if (
      k.includes('equipment') ||
      k.includes('utilization') ||
      k.includes('liugong') ||
      k.includes('service') ||
      k.includes('fmc') ||
      k.includes('unit')
    ) {
      return 'Equipment Possibility of Success';
    }
    if (k.includes('delivery') || k.includes('qa')) {
      return 'Unit Delivery Status & QA Check';
    }
    if (
      k.includes('equity') ||
      k.includes('capital') ||
      k.includes('repayment') ||
      k.includes('area') ||
      k.includes('pic') ||
      k.includes('lead')
    ) {
      return 'Basic / General Information';
    }
    return 'Credit Evaluation & Analyst Remarks';
  }

  // Customer & PIC mappings
  if (
    k.includes('address') ||
    k.includes('city') ||
    k.includes('province') ||
    k.includes('district') ||
    k.includes('village') ||
    k.includes('rt') ||
    k.includes('rw') ||
    k.includes('postal') ||
    k.includes('phone') ||
    k.includes('email') ||
    k.includes('website') ||
    k.includes('branch') ||
    k.includes('domicile') ||
    k.includes('location')
  ) {
    return 'Registration Office & Company Domicile';
  }
  if (k.includes('pic') || k.includes('contact') || k.includes('ktp') || k.includes('idcard')) {
    return 'Primary Contact / Person in Charge (PIC)';
  }
  if (
    k.includes('nib') ||
    k.includes('npwp') ||
    k.includes('category') ||
    k.includes('customerstatus') ||
    k.includes('companyname') ||
    k.includes('companytype') ||
    k.includes('classification')
  ) {
    return 'Debtor Identity & Classification';
  }
  if (
    k.includes('business') ||
    k.includes('deed') ||
    k.includes('repayment') ||
    k.includes('experience') ||
    k.includes('establishment') ||
    k.includes('latestdeed')
  ) {
    return 'Business Profile & Deed Legality';
  }
  if (k.includes('segment') || k.includes('role') || k.includes('project')) {
    return 'Industry Segmentation & Active Projects';
  }
  if (k.includes('share') || k.includes('stakeholder')) {
    return 'Shareholders & Stakeholder Register';
  }
  if (k.includes('bank')) {
    return 'Bank Facilities';
  }
  if (
    k.includes('financing') ||
    k.includes('tenor') ||
    k.includes('downpayment') ||
    k.includes('interest') ||
    k.includes('paymentmethod')
  ) {
    return 'Financing Proposal';
  }
  if (k.includes('unit') || k.includes('equipment')) {
    return 'Equipment Units';
  }
  if (k.includes('financial') || k.includes('balance') || k.includes('profit')) {
    return 'Balance Sheet & Income Statement';
  }
  return 'General Information';
}
