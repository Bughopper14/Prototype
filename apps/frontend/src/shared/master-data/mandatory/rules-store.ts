/** The mandatory rules of the workflow an application runs in: loaded from the server, kept in memory, and the isFieldMandatory check the forms use. */
import {api} from '@/shared/lib/api';
import {useEffect, useState} from 'react';

/** One rule of crm_workflow_stage_fields, as /mandatory sends it: the master field it is about (section code + field key) and whether it is mandatory. */
export type MandatoryRule = {id: string; formCode: string; sectionCode: string; section: string; fieldKey: string; label: string; enforceable: boolean; mandatory: boolean};

let rulesCache: MandatoryRule[] = [];
/** The workflow whose rules the screens use: the one of the open application, else the active workflow. */
let rulesWorkflowId: string | undefined;
let inFlight: Promise<MandatoryRule[]> | null = null;

export function setMandatoryRules(data: MandatoryRule[]) {
  rulesCache = data || [];
  window.dispatchEvent(new Event('mandatory-updated'));
}

/** An application opened in a workflow other than the active one needs that workflow's rules. */
export function selectMandatoryWorkflow(workflowId?: string) {
  if (workflowId === rulesWorkflowId) return;
  rulesWorkflowId = workflowId;
  inFlight = null;
  setMandatoryRules([]);
  void fetchMandatoryRules();
}

/** Re-fetches the active workflow's mandatory rules immediately after a workflow is saved or switched active. */
export function refreshMandatoryRules(): Promise<MandatoryRule[]> {
  if (rulesWorkflowId !== undefined) return Promise.resolve(rulesCache);
  inFlight = null;
  return fetchMandatoryRules();
}

export function fetchMandatoryRules(): Promise<MandatoryRule[]> {
  if (inFlight) return inFlight;
  const wanted = rulesWorkflowId;
  inFlight = api(wanted ? `/mandatory?workflowId=${encodeURIComponent(wanted)}` : '/mandatory')
    .then((data: any) => {
      inFlight = null;
      // an answer for a workflow that is no longer the selected one is dropped
      if (Array.isArray(data) && wanted === rulesWorkflowId) setMandatoryRules(data);
      return rulesCache;
    })
    .catch(() => {
      inFlight = null;
      return rulesCache;
    });
  return inFlight;
}

export function useMandatoryRules(): MandatoryRule[] {
  const [rules, setRules] = useState<MandatoryRule[]>(rulesCache);
  useEffect(() => {
    let active = true;
    void fetchMandatoryRules().then(data => active && setRules(data));
    const update = () => active && setRules(rulesCache);
    window.addEventListener('mandatory-updated', update);
    return () => {
      active = false;
      window.removeEventListener('mandatory-updated', update);
    };
  }, []);
  return rules;
}

/** Is the field `fieldKey` of a whole form (crm_master_forms.code, e.g. PRE-ANALYSIS-FORM) mandatory in the workflow? For a form whose field keys are unique across its sections. */
export function isFormFieldMandatory(rules: MandatoryRule[], formCode: string, fieldKey: string): boolean {
  return rules.some(r => r.mandatory && r.formCode === formCode && r.fieldKey === fieldKey);
}

/**
 * Is the input `fieldKey` of the form section `sectionCode` (crm_master_form_sections.code) mandatory in the workflow? True when the workflow marks
 * the master field mandatory in any of its stages.
 * No rule, no star: a field the workflow does not ask for is never required.
 */
export function isFieldMandatory(rules: MandatoryRule[], sectionCode: string | undefined, fieldKey: string): boolean {
  if (!sectionCode) return false;
  return rules.some(r => r.mandatory && r.sectionCode === sectionCode && r.fieldKey === fieldKey);
}
