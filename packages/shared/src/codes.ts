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

/** A string that is already a standard code (so toCode would leave it as it is). */
export const isCode = (value: unknown): value is string => typeof value === 'string' && value !== '' && toCode(value) === value;

/**
 * Reads the name of an approval authority. By convention (created in User Management) it is
 *   APPCODE_DEPTCODE_STAGECODE_APPROVE                    a stage (or a group)
 *   APPCODE_DEPTCODE_STAGECODE_DOCUMENTCODE_APPROVE       one document of a stage
 * e.g. CRM_BS_FAP-STAGE_APPROVE. The suffix APPROVE means "can approve and reject". Codes use hyphens only, so the underscore separates the
 * parts. Returns null when the name does not follow the pattern. The comparison ignores the case.
 */
export function parseApprovalAuthority(name: string): {appCode: string; departmentCode: string; codes: string[]; action: string} | null {
  const parts = String(name ?? '').trim().toUpperCase().split('_');
  if (parts.length < 4 || parts.length > 5) return null;
  if (!parts.every(p => p !== '' && p === toCode(p))) return null;
  // the last part must be the action: an older name such as crm_workflow_recommend_credit is not in this format
  if (!['APPROVE', 'REJECT'].includes(parts[parts.length - 1])) return null;
  return {appCode: parts[0], departmentCode: parts[1], codes: parts.slice(2, -1), action: parts[parts.length - 1]};
}

/** Does the name end with APPROVE or REJECT: an authority made for approving. */
export const isApprovalAuthorityName = (name: string): boolean => /_(APPROVE|REJECT)$/i.test(String(name ?? '').trim());
