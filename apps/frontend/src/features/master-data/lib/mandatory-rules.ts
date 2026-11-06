/** Pure helpers for the Field Mandatory tab: stage checks, filtering and section badge colours. */

export type StageFilter = 'ALL' | 'FAP' | 'PRE-AN';
export type StatusFilter = 'ALL' | '1' | '0';

export interface MandatoryFilters {
  search: string;
  stage: StageFilter;
  section: string;
  status: StatusFilter;
}

export interface BadgeStyle {
  color: string;
  bg: string;
  border: string;
}

/** PRE-AN rules are stored as either "PRE-AN" or "PRE"; anything else (or empty) counts as FAP. */
export function isPreStage(stage?: string | null): boolean {
  const s = String(stage || 'FAP').toUpperCase();
  return s === 'PRE-AN' || s === 'PRE';
}

export function stageLabel(stage?: string | null): 'PRE-AN' | 'FAP' {
  return isPreStage(stage) ? 'PRE-AN' : 'FAP';
}

export function splitByStage<T extends {stage?: string | null; mandatory?: unknown}>(rules: T[]) {
  const fap = rules.filter(r => (r.stage || 'FAP').toUpperCase() === 'FAP');
  const pre = rules.filter(r => isPreStage(r.stage || ''));
  return {
    fap,
    pre,
    fapMandatory: fap.filter(r => r.mandatory).length,
    preMandatory: pre.filter(r => r.mandatory).length,
    mandatory: rules.filter(r => r.mandatory).length,
  };
}

export function filterRules<T extends Record<string, any>>(rules: T[], f: MandatoryFilters): T[] {
  const q = f.search.trim().toLowerCase();
  return rules.filter(x => {
    const rStage = (x.stage || 'FAP').toUpperCase();
    const matchStage = f.stage === 'ALL' || rStage === f.stage;
    const matchSection = f.section === 'ALL' || x.section === f.section;
    const matchStatus = f.status === 'ALL' || (f.status === '1' ? Boolean(x.mandatory) : !x.mandatory);
    const matchSearch =
      !q ||
      String(x.field_label || '')
        .toLowerCase()
        .includes(q) ||
      String(x.field_key || '')
        .toLowerCase()
        .includes(q) ||
      String(x.section || '')
        .toLowerCase()
        .includes(q) ||
      ((rStage === 'PRE-AN' || rStage === 'PRE') && (q.includes('pre') || q.includes('analysis'))) ||
      (rStage === 'FAP' && (q.includes('fap') || q.includes('stage')));
    return matchStage && matchSection && matchStatus && matchSearch;
  });
}

export function sectionBadgeStyle(sec: string, stage?: string): BadgeStyle {
  const s = String(sec || '').toLowerCase();
  const st = String(stage || '').toUpperCase();
  if (st === 'PRE-AN' || st === 'PRE') {
    if (s.includes('general')) return {color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd'};
    if (s.includes('project')) return {color: '#4338ca', bg: '#eef2ff', border: '#c7d2fe'};
    if (s.includes('customer') || s.includes('group') || s.includes('background'))
      return {color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4'};
    if (s.includes('equipment')) return {color: '#b45309', bg: '#fffbeb', border: '#fde68a'};
    if (s.includes('delivery') || s.includes('qa'))
      return {color: '#c2410c', bg: '#fff7ed', border: '#ffedd5'};
    if (s.includes('cross') || s.includes('check') || s.includes('dealer') || s.includes('lmi'))
      return {color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe'};
    if (s.includes('conclusion') || s.includes('expert') || s.includes('recommendation'))
      return {color: '#be185d', bg: '#fdf2f8', border: '#fbcfe8'};
    return {color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd'};
  }
  if (s.includes('debtor') || s.includes('identity') || s.includes('classification'))
    return {color: '#3730a3', bg: '#eef2ff', border: '#c7d2fe'};
  if (s.includes('domicile') || s.includes('office') || s.includes('registration'))
    return {color: '#047857', bg: '#ecfdf5', border: '#a7f3d0'};
  if (s.includes('business') || s.includes('legality') || s.includes('deed'))
    return {color: '#b45309', bg: '#fffbeb', border: '#fde68a'};
  if (s.includes('pic') || s.includes('contact') || s.includes('primary contact'))
    return {color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe'};
  if (s.includes('industry') || s.includes('projects') || s.includes('segmentation'))
    return {color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe'};
  return {color: '#475569', bg: '#f1f5f9', border: '#cbd5e1'};
}
