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


