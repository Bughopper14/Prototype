/** Mandatory-rule cache (memory + localStorage), server sync, React hook and the isFieldMandatory check. */
import {api} from '@/shared/lib/api';
import {useEffect, useState} from 'react';
import {DEFAULT_MANDATORY_RULES} from './default-rules';
import {getSectionAliases, normalizeRule, normalizeStage, resolveRuleSection} from './sections';

const MANDATORY_STORAGE_KEY = 'liugong_mandatory_rules_cache_v25';

// Automatically clear obsolete cache versions
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    for (let i = 1; i <= 24; i++) {
      localStorage.removeItem('liugong_mandatory_rules_cache_v' + i);
    }
    localStorage.removeItem('liugong_mandatory_rules_cache');
    try {
      const demoRaw = localStorage.getItem('liugong_demo_state');
      if (demoRaw) {
        const demoObj = JSON.parse(demoRaw);
        if (
          demoObj &&
          demoObj.mandatoryRules &&
          (!demoObj.mandatoryRules.some((r: any) => r.stage === 'PRE-AN') ||
            !demoObj.mandatoryRules.some((r: any) => r.field_key === 'nibDate'))
        ) {
          delete demoObj.mandatoryRules;
          localStorage.setItem('liugong_demo_state', JSON.stringify(demoObj));
        }
      }
    } catch {}
  }
} catch {}

function getInitialMandatoryRules(): any[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(MANDATORY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          Array.isArray(parsed) &&
          parsed.length === DEFAULT_MANDATORY_RULES.length &&
          parsed.some((x: any) => x.field_key === 'nibDate')
        ) {
          return parsed.map(normalizeRule);
        }
      }
    }
  } catch {}
  return DEFAULT_MANDATORY_RULES.map(normalizeRule);
}

let mandatoryCatalogCache: any[] = getInitialMandatoryRules();

let mandatoryMapCache = new Map<string, boolean>();

function buildMandatoryMap(rules: any[]) {
  const map = new Map<string, boolean>();
  for (const r of rules) {
    if (!r) continue;
    const isMandatory = Boolean(r.mandatory);
    const fKey = String(r.field_key || '').trim();
    const sec = String(r.section || '').trim();
    const stg = normalizeStage(r.stage);
    if (fKey) {
      // Stage-scoped entries:
      map.set(`${stg}:*:${fKey}`, isMandatory);
      if (sec) {
        const aliases = getSectionAliases(sec, stg);
        for (const al of aliases) {
          map.set(`${stg}:${al}:${fKey}`, isMandatory);
        }
      }
      // Global fallback (only if stage is not specified)
      map.set(`*:${fKey}`, isMandatory);
      if (sec) {
        const aliases = getSectionAliases(sec, stg);
        for (const al of aliases) {
          map.set(`${al}:${fKey}`, isMandatory);
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

export function fetchMandatoryRules(): Promise<any[]> {
  if (inFlightMandatoryPromise) return inFlightMandatoryPromise;
  inFlightMandatoryPromise = api('/mandatory')
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

  if (normStg) {
    if (normSec) {
      const directKey = `${normStg}:${normSec}:${fieldKey}`;
      if (mandatoryMapCache.has(directKey)) {
        return mandatoryMapCache.get(directKey)!;
      }
      const aliases = getSectionAliases(normSec, normStg);
      for (const al of aliases) {
        const aliasKey = `${normStg}:${al}:${fieldKey}`;
        if (mandatoryMapCache.has(aliasKey)) {
          return mandatoryMapCache.get(aliasKey)!;
        }
      }
    }
    const stageWildKey = `${normStg}:*:${fieldKey}`;
    if (mandatoryMapCache.has(stageWildKey)) {
      return mandatoryMapCache.get(stageWildKey)!;
    }
  }

  if (normSec) {
    const directKey = `${normSec}:${fieldKey}`;
    if (mandatoryMapCache.has(directKey)) {
      return mandatoryMapCache.get(directKey)!;
    }
    const aliases = getSectionAliases(normSec);
    for (const al of aliases) {
      const aliasKey = `${al}:${fieldKey}`;
      if (mandatoryMapCache.has(aliasKey)) {
        return mandatoryMapCache.get(aliasKey)!;
      }
    }
  }

  if (mandatoryMapCache.has(`*:${fieldKey}`)) {
    return mandatoryMapCache.get(`*:${fieldKey}`)!;
  }

  return Boolean(defaultRequired);
}
