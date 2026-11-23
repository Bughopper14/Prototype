/**
 * Which screen of the workspace a form is shown on. A workflow stage points at a master form (crm_master_forms.code, the stage's form_code); the form
 * decides the screen, never the code or the name of the stage. A form without an entry here is shown as plain documents (the shared document tabs).
 * This is the ONLY place that maps a form to a screen: a new form that needs its own screen is added here once.
 */
export type Screen = 'FAP' | 'PRE_ANALYSIS' | 'DOCUMENTS';

export const FORM_SCREEN: Record<string, Screen> = {
  'FAP-FORM': 'FAP',
  'PRE-ANALYSIS-FORM': 'PRE_ANALYSIS',
};

export const screenOfForm = (formCode?: string | null): Screen => (formCode && FORM_SCREEN[formCode]) || 'DOCUMENTS';
