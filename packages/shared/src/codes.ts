/**
 * One standard for every code of the workflow layer (workflow, group, stage, document, department, authority), used by the backend and
 * the frontend so a code looks the same everywhere.
 *
 * A code is trimmed, upper-case, and every run of characters that are not a letter or digit becomes ONE hyphen (never an underscore).
 * Because codes never contain an underscore, the underscore is free to separate the parts of an authority name.
 */
export const toCode = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * The standard form of every CRM authority: CRM_<AREA>_<ACTION>, upper case, an underscore between the parts and hyphens inside a part.
 *   CRM_APPLICATION_VIEW          CRM_LEGAL_EDIT          CRM_DOCUMENT-DESK_MANAGE          CRM_WORKFLOW_START-REVIEW
 * An approval authority names the thing and the department that approves it, the action last:
 *   CRM_FAP-FORM_BS_APPROVE       CRM_GROUP_MANAGEMENT_APPROVE      CRM_DEED-REVIEW_LEGAL_APPROVE
 * Returns the parts, or null when the name does not follow the form. The comparison ignores the case.
 */
export function parseAuthorityName(name: string): {appCode: string; area: string[]; action: string} | null {
  const parts = String(name ?? '').trim().toUpperCase().split('_');
  if (parts.length < 3 || !parts.every(p => p !== '' && p === toCode(p))) return null;
  return {appCode: parts[0], area: parts.slice(1, -1), action: parts[parts.length - 1]};
}

