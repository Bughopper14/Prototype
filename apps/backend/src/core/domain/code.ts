/** The code the backend stores for a name: trimmed, upper-case, anything that is not a letter or digit becomes one hyphen (never an underscore). */
export const toCode = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** A code that is not in `taken` yet: the name as a code, with -2, -3... when it is taken (cut to `max` characters). */
export function uniqueCode(name: unknown, taken: (code: string) => boolean | Promise<boolean>, max = 50, fallback = 'ITEM') {
  const base = (toCode(name) || fallback).slice(0, max - 4);
  return (async () => {
    for (let n = 1; ; n++) {
      const candidate = n === 1 ? base : `${base}-${n}`;
      if (!(await taken(candidate))) return candidate;
    }
  })();
}
