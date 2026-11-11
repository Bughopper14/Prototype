/** Which fields only take digits / letters / Title Case, and the pure parts of editing one field. */
import {calculateAgeYearsMonths} from '@/shared/lib/format';
import {resetMasterChildren, resolveWilayahUpwards, type useMasterData} from '@/shared/master-data';
import type {Field} from '@liugong/shared';

export const DIGITS_ONLY_KEYS = ['phone', 'mobilePhone', 'phoneFax', 'rt', 'rw'];
export const LETTERS_ONLY_KEYS = ['repaymentSource'];
export const TITLE_CASE_KEYS = [
  'companyName',
  'mainBusiness',
  'picName',
  'projectOwner',
  'projectLocation',
  'projectRole',
  'position',
  'name',
  'firstName',
  'middleName',
  'lastName',
  'occupation',
  'designation',
  'bankOrFinInstitution',
  'paymentRecord',
  'assetName',
  'brand',
  'modelName',
  'purposeDetail',
  'termsNotes',
  'companyAddress',
  'currentAddress',
  'address',
];
/** Calculated from other fields, so never typed. */
export const AGE_KEYS = ['ageYears', 'ageMonths', 'experienceYears', 'experienceMonths'];

const NAVIGATION_KEYS = [
  'Backspace',
  'Tab',
  'Enter',
  'Escape',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Delete',
  'Home',
  'End',
];

/** onKeyDown that lets only digits (or only non-digits) through; navigation and shortcuts always pass. */
export const onlyKeys = (kind: 'digits' | 'letters') => (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.ctrlKey || e.metaKey || NAVIGATION_KEYS.includes(e.key)) return;
  const isDigit = /^\d$/.test(e.key);
  if (kind === 'digits' ? !isDigit : isDigit) e.preventDefault();
};

/** The record after one field changed: sanitised, master children reset, village → ZIP, age and wilayah recalculated. */
export function applyFieldValue({
  f,
  fields,
  value,
  raw,
  master,
}: {
  f: Field;
  fields: Field[];
  value: any;
  raw: string;
  master: ReturnType<typeof useMasterData>;
}) {
  const isDigitsOnly = DIGITS_ONLY_KEYS.includes(f.key);
  const isLettersOnly = LETTERS_ONLY_KEYS.includes(f.key);
  const clean = isDigitsOnly ? raw.replace(/\D/g, '') : isLettersOnly ? raw.replace(/\d/g, '') : raw;
  const sanitized = ['rt', 'rw'].includes(f.key) ? clean.slice(0, 3) : clean;
  // master: false = free text (e.g. a foreign address): no cascading reset or wilayah lookup
  const masterLinked = f.master !== false;
  const changed = {
    ...value,
    [f.key]: f.type === 'number' ? sanitized : f.type === 'date' ? sanitized || null : sanitized,
  };
  let next = masterLinked
    ? resetMasterChildren(
        f.key,
        changed,
        fields.map(x => x.key),
      )
    : changed;
  if (masterLinked && f.key === 'village' && fields.some(x => x.key === 'postalCode'))
    next.postalCode = master.village.find(x => x.value === sanitized)?.zipCode || '';
  if (f.key === 'dateOfBirth' && fields.some(x => x.key === 'ageYears' || x.key === 'ageMonths')) {
    const {years, months} = calculateAgeYearsMonths(sanitized);
    next.ageYears = years;
    next.ageMonths = months;
  }
  if (masterLinked && ['district', 'village', 'postalCode'].includes(f.key)) {
    next = resolveWilayahUpwards(next, master);
  }
  return next;
}
