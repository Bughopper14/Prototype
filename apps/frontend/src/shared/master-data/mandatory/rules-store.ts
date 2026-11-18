/** Mandatory-rule cache (memory + localStorage), server sync, React hook and the isFieldMandatory check. */
import {api} from '@/shared/lib/api';
import {useEffect, useState} from 'react';
import {getSectionAliases, normalizeRule, normalizeStage, resolveRuleSection} from './sections';

/** Rules come only from the server (crm_workflow_stage_fields of a workflow); the last copy is kept for the next page load. */
const MANDATORY_STORAGE_KEY = 'liugong_mandatory_rules';

function getInitialMandatoryRules(): any[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(MANDATORY_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.map(normalizeRule) : [];
  } catch {
    return [];
  }
}

let mandatoryCatalogCache: any[] = getInitialMandatoryRules();

let mandatoryMapCache = new Map<string, boolean>();

function buildMandatoryMap(rules: any[]) {
  const map = new Map<string, boolean>();
  // A field is mandatory when any stage of the workflow asks for it (rules of several stages share one stage key here).
  const put = (key: string, value: boolean) => map.set(key, (map.get(key) ?? false) || value);
  for (const r of rules) {
    if (!r) continue;
    const isMandatory = Boolean(r.mandatory);
    const fKey = String(r.field_key || '').trim();
    const sec = String(r.section || '').trim();
    const stg = normalizeStage(r.stage);
    if (fKey) {
      // Stage-scoped entries:
      put(`${stg}:*:${fKey}`, isMandatory);
      if (sec) {
        const aliases = getSectionAliases(sec, stg);
        for (const al of aliases) {
          put(`${stg}:${al}:${fKey}`, isMandatory);
        }
      }
      // Global fallback (only if stage is not specified)
      put(`*:${fKey}`, isMandatory);
      if (sec) {
        const aliases = getSectionAliases(sec, stg);
        for (const al of aliases) {
          put(`${al}:${fKey}`, isMandatory);
        }
      }
    }
  }
  return map;
}

mandatoryMapCache = buildMandatoryMap(mandatoryCatalogCache);

export function setMandatoryRules(data: any[]) {
  const normalized = (data || []).map(normalizeRule);
  mandatoryCatalogCache = normalized;
  mandatoryMapCache = buildMandatoryMap(normalized);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(MANDATORY_STORAGE_KEY, JSON.stringify(normalized));
    }
  } catch {}
  window.dispatchEvent(new Event('mandatory-updated'));
}

let inFlightMandatoryPromise: Promise<any[]> | null = null;

/** The workflow whose rules the screens use: the one of the open application, else the active workflow. */
let rulesWorkflowId: string | undefined;

/** An application opened in a workflow other than the active one needs that workflow's rules. */
export function selectMandatoryWorkflow(workflowId?: string) {
  if (workflowId === rulesWorkflowId) return;
  rulesWorkflowId = workflowId;
  inFlightMandatoryPromise = null;
  mandatoryCatalogCache = [];
  mandatoryMapCache = new Map();
  try {
    localStorage.removeItem(MANDATORY_STORAGE_KEY);
  } catch {}
  void fetchMandatoryRules();
}

export function fetchMandatoryRules(): Promise<any[]> {
  if (inFlightMandatoryPromise) return inFlightMandatoryPromise;
  inFlightMandatoryPromise = api(rulesWorkflowId ? `/mandatory?workflowId=${encodeURIComponent(rulesWorkflowId)}` : '/mandatory')
    .then((data: any) => {
      inFlightMandatoryPromise = null;
      if (Array.isArray(data)) {
        setMandatoryRules(data);
        return data;
      }
      return mandatoryCatalogCache;
    })
    .catch(() => {
      inFlightMandatoryPromise = null;
      return mandatoryCatalogCache;
    });
  return inFlightMandatoryPromise;
}

export function useMandatoryRules() {
  const [rules, setRules] = useState<any[]>(() =>
    mandatoryCatalogCache.map(r => ({...r, section: resolveRuleSection(r)})),
  );
  useEffect(() => {
    let active = true;
    fetchMandatoryRules().then(data => {
      if (active && Array.isArray(data)) {
        setRules(data.map(normalizeRule));
      }
    });
    const handleUpdate = () => {
      if (active) setRules(mandatoryCatalogCache.map(normalizeRule));
    };
    window.addEventListener('mandatory-updated', handleUpdate);
    return () => {
      active = false;
      window.removeEventListener('mandatory-updated', handleUpdate);
    };
  }, []);
  return rules.map(normalizeRule);
}

export function isFieldMandatory(
  rules: any[],
  section: string | undefined,
  fieldKey: string,
  defaultRequired?: boolean,
  stage?: string,
): boolean {
  if (rules && rules.length) {
    mandatoryMapCache = buildMandatoryMap(rules);
  } else if (!mandatoryMapCache.size && mandatoryCatalogCache.length) {
    mandatoryMapCache = buildMandatoryMap(mandatoryCatalogCache);
  }
  if (!mandatoryMapCache.size) return Boolean(defaultRequired);

  const normSec = (section || '').toLowerCase().trim();
  const normStg = stage ? normalizeStage(stage) : '';

  // Fields stored under one key and shown under another (deed decree, stakeholder ids, capital…)
  const synonyms: Record<string, string[]> = {
    ministerialDecreeNumber: ['decreeNumber'],
    decreeNumber: ['ministerialDecreeNumber'],
    ministerialDecreeDate: ['decreeDate'],
    decreeDate: ['ministerialDecreeDate'],
    depositedCapital: ['shareAmount'],
    shareAmount: ['depositedCapital'],
    idNumberSecondary: ['taxNumber'],
    taxNumber: ['idNumberSecondary'],
    citizenship: ['nationalityType'],
    nationalityType: ['citizenship'],
    firstName: ['shareholderName'],
    name: ['shareholderName'],
    shareholderName: ['firstName', 'name'],
    representativeType: ['shareholderPosition'],
    designation: ['shareholderPosition'],
    shareholderPosition: ['representativeType', 'designation'],
  };
  for (const fk of [fieldKey, ...(synonyms[fieldKey] || [])]) {
    if (normStg) {
      if (normSec) {
        const directKey = `${normStg}:${normSec}:${fk}`;
        if (mandatoryMapCache.has(directKey)) return mandatoryMapCache.get(directKey)!;
        for (const al of getSectionAliases(normSec, normStg)) {
          const aliasKey = `${normStg}:${al}:${fk}`;
          if (mandatoryMapCache.has(aliasKey)) return mandatoryMapCache.get(aliasKey)!;
        }
      }
      const stageWildKey = `${normStg}:*:${fk}`;
      if (mandatoryMapCache.has(stageWildKey)) return mandatoryMapCache.get(stageWildKey)!;
    }
    if (normSec) {
      const directKey = `${normSec}:${fk}`;
      if (mandatoryMapCache.has(directKey)) return mandatoryMapCache.get(directKey)!;
      for (const al of getSectionAliases(normSec)) {
        const aliasKey = `${al}:${fk}`;
        if (mandatoryMapCache.has(aliasKey)) return mandatoryMapCache.get(aliasKey)!;
      }
    }
    if (mandatoryMapCache.has(`*:${fk}`)) return mandatoryMapCache.get(`*:${fk}`)!;
  }

  return Boolean(defaultRequired);
}
