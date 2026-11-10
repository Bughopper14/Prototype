/** Field lists and small helpers shared by the intake queries. */
import {customerFields, profileFields, applicationOnlyProfileKeys} from '@liugong/shared';

const fapCustomer = [
  'companyName',
  'companyType',
  'nib',
  'nibDate',
  'npwp',
  'establishmentActNo',
  'establishmentDate',
  'experienceYears',
  'experienceMonths',
];
const fapProfile = [
  'branchCode',
  'companyAddress',
  'province',
  'city',
  'district',
  'village',
  'rt',
  'rw',
  'postalCode',
];
export const fapFields = [
  ...customerFields.filter(f => fapCustomer.includes(f.key)),
  ...profileFields.filter(f => fapProfile.includes(f.key)),
];
export const preFields = [
  ...customerFields.filter(f => !fapCustomer.includes(f.key)),
  ...profileFields.filter(
    f => f.key !== 'customerStatus' && !fapProfile.includes(f.key) && !fapCustomer.includes(f.key),
  ),
];
export const directoryFields = [
  ...customerFields,
  ...profileFields.filter(f => f.key !== 'customerStatus' && !applicationOnlyProfileKeys.includes(f.key)),
];
export const column = (s: string) => s.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
export const picColumn = (s: string) =>
  s === 'district'
    ? 'kecamatan'
    : s === 'village'
      ? 'kelurahan'
      : s === 'currentAddress'
        ? 'alamat_pic'
        : column(s);
export const same = (a: any, b: any) => String(a ?? '') === String(b ?? '');
export const databaseValue = (value: any, type?: string) =>
  value instanceof Date ? value.toISOString().slice(0, 10) : value;
export const fieldType = (f: any) =>
  f.key === 'experienceYears' || f.key === 'experienceMonths'
    ? 'INT'
    : f.type === 'date'
      ? 'DATE'
      : f.type === 'number'
        ? 'INT'
        : 'TEXT';
export const sanitizeFieldValue = (value: any, type?: string) => {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (type === 'date') return trimmed.slice(0, 10);
    return trimmed;
  }
  if (type === 'date') return null;
  if (type === 'number' && typeof value === 'number' && Number.isNaN(value)) return null;
  return value;
};
export const readFields = (row: any, fields: readonly any[]) =>
  Object.fromEntries(fields.map(f => [f.key, databaseValue(row[column(f.key)], f.type)]));
export const inputFields = (input: any, fields: readonly any[]) =>
  Object.fromEntries(fields.map(f => [column(f.key), sanitizeFieldValue(input?.[f.key], f.type)]));
export const fieldValues = (input: any, fields: readonly any[]) =>
  fields.map(f => sanitizeFieldValue(input?.[f.key], f.type));
export const customerDirectoryValues = (customer: any, profile: any, relationship: string) => ({
  ...inputFields({...customer, ...profile}, directoryFields),
  customer_relationship: relationship,
});
export const mysqlError = (message: string, status = 422) => Object.assign(new Error(message), {status});
