/** Form sections per stage and the name aliases used to match a rule to a section. */

export const MANDATORY_SECTIONS_FAP = [
  'Debtor Identity & Classification',
  'Registration Office & Company Domicile',
  'Business Profile & Deed Legality',
  'Primary Contact / Person in Charge (PIC)',
  'Purpose of Financing & Fixed Assets',
  'Industry Segmentation & Active Projects',
  'Bank Facilities & References',
  'Financing Proposal',
  'Financial Statements',
  'Legal Deeds & Amendments',
  'Shareholders & Management',
] as const;

export const MANDATORY_SECTIONS_PRE = [
  'General Information',
  'Project Information',
  'Customer & Group Background',
  'Equipment Possibility of Success',
  'Unit Delivery Status & QA Check',
  'Cross-Check with Dealer / LMI',
  'Expert Judgement Conclusion',
] as const;

export const MANDATORY_SECTIONS = [...MANDATORY_SECTIONS_FAP, ...MANDATORY_SECTIONS_PRE] as const;

export function cleanSectionName(sec: string): string {
  if (!sec) return '';
  return String(sec)
    .replace(/^(?:0[1-9]|[1-9])\.\s*|^(?:0[1-9]|[1-9])\s*/, '')
    .trim();
}

export function normalizeRule(r: any) {
  if (!r) return r;
  const rawStage = String(r.stage || '').toUpperCase();
  const normalizedStage = rawStage === 'PRE-AN' || rawStage === 'PRE' ? 'PRE-AN' : 'FAP';
  const stageRule = {...r, stage: normalizedStage};
  return {
    ...stageRule,
    section: resolveRuleSection(stageRule),
  };
}

export function resolveRuleSection(rule: {
  id?: number;
  stage?: string;
  section?: string;
  field_key?: string;
}): string {
  const stage = String(rule?.stage || '').toUpperCase();
  const rawSec = cleanSectionName(String(rule?.section || ''));
  const fKey = String(rule?.field_key || '');

  // Pre-Analysis Stage Resolution
  if (stage === 'PRE-AN' || stage === 'PRE') {
    for (const s of MANDATORY_SECTIONS_PRE) {
      if (rawSec.toLowerCase() === s.toLowerCase()) return s;
    }
    const sec = rawSec.toLowerCase();
    if (sec.includes('general')) return 'General Information';
    if (sec.includes('project')) return 'Project Information';
    if (sec.includes('customer') || sec.includes('group') || sec.includes('background'))
      return 'Customer & Group Background';
    if (sec.includes('equipment') || sec.includes('possibility')) return 'Equipment Possibility of Success';
    if (sec.includes('delivery') || sec.includes('qa')) return 'Unit Delivery Status & QA Check';
    if (sec.includes('cross') || sec.includes('check') || sec.includes('dealer') || sec.includes('lmi'))
      return 'Cross-Check with Dealer / LMI';
    if (
      sec.includes('conclusion') ||
      sec.includes('expert') ||
      sec.includes('judgement') ||
      sec.includes('recommendation') ||
      sec.includes('prelimenary') ||
      sec.includes('preliminary')
    )
      return 'Expert Judgement Conclusion';
    return rawSec || 'General Information';
  }

  // FAP Stage Resolution (Exact 5 sections)
  // 1. If rule already has an official section name, respect it!
  for (const s of MANDATORY_SECTIONS_FAP) {
    if (rawSec.toLowerCase() === s.toLowerCase()) return s;
  }

  const sec = rawSec.toLowerCase();

  // Seksi 1: Debtor Identity & Classification (Exact 8 fields from form card 01)
  if (
    [
      'customerCategory',
      'companyName',
      'companyType',
      'nib',
      'nibDate',
      'npwp',
      'establishmentActNo',
      'establishmentDate',
    ].includes(fKey)
  ) {
    return 'Debtor Identity & Classification';
  }

  // Seksi 5: Industry Segmentation & Active Projects (Exact 4 fields from form card 05)
  if (['projectOwner', 'projectLocation', 'projectRole', 'contractStatus'].includes(fKey)) {
    return 'Industry Segmentation & Active Projects';
  }

  // Seksi 3: Business Profile & Deed Legality (Exact 8 fields from form card 03)
  if (
    [
      'mainBusiness',
      'repaymentSource',
      'industrySegment',
      'businessRole',
      'experienceYears',
      'experienceMonths',
      'latestDeedNo',
      'latestDeedDate',
    ].includes(fKey)
  ) {
    return 'Business Profile & Deed Legality';
  }

  // Seksi 4: Primary Contact / Person in Charge (PIC) (Exact 13 fields from form card 04)
  if (
    ['picName', 'position', 'phone', 'currentAddress', 'country'].includes(fKey) ||
    sec.includes('pic') ||
    sec.includes('contact')
  ) {
    return 'Primary Contact / Person in Charge (PIC)';
  }

  // Seksi 2: Registration Office & Company Domicile (Exact 14 fields from form card 02)
  return 'Registration Office & Company Domicile';
}

export const normalizeStage = (st?: string): 'FAP' | 'PRE-AN' => {
  const s = String(st || '')
    .toUpperCase()
    .trim();
  return s === 'PRE-AN' || s === 'PRE' || s.includes('PRE') ? 'PRE-AN' : 'FAP';
};

export function getSectionAliases(secName: string, stage?: string): string[] {
  const norm = (secName || '').toLowerCase().trim();
  const aliases: string[] = [norm];
  const stg = stage ? normalizeStage(stage) : '';

  if (
    norm.includes('debtor') ||
    norm.includes('identity') ||
    norm.includes('classification') ||
    norm.includes('customer') ||
    norm.startsWith('01')
  ) {
    aliases.push('customer', 'debtor', 'identity', 'classification', '01');
  }
  if (
    norm.includes('domicile') ||
    norm.includes('office') ||
    norm.includes('registration') ||
    norm.includes('company') ||
    norm.startsWith('02')
  ) {
    aliases.push('company', 'office', 'domicile', 'registration', '02', 'profile');
  }
  if (
    norm.includes('legal deeds') ||
    (norm.includes('legal') && norm.includes('deed')) ||
    norm.includes('amendment')
  ) {
    aliases.push('legal deeds & amendments', 'legal deeds', 'deeds', 'legal');
  }
  if (norm.includes('shareholder') || norm.includes('management') || norm.includes('stakeholder')) {
    aliases.push('shareholders & management', 'shareholders', 'stakeholders', 'management');
  }
  if (
    ((norm.includes('business') || norm.includes('legality')) &&
      !norm.includes('legal deeds') &&
      !norm.includes('amendment')) ||
    (norm.includes('deed') && !norm.includes('legal deeds') && !norm.includes('amendment')) ||
    norm.startsWith('03')
  ) {
    aliases.push('business', 'legality', 'deed', 'profile', '03');
  }
  if (norm.includes('pic') || norm.includes('contact') || norm.startsWith('04')) {
    aliases.push('pic', 'contact', '04');
  }
  if (
    stg === 'FAP' ||
    (!stg && (norm.includes('active') || norm.includes('segmentation') || norm.startsWith('05')))
  ) {
    aliases.push('projects', 'project', 'industry', 'segmentation', '05');
  } else if (stg === 'PRE-AN') {
    aliases.push('project_information', 'project information', 'pre_project');
  } else {
    aliases.push('projects', 'project', 'industry', 'segmentation', '05');
  }
  return aliases;
}
