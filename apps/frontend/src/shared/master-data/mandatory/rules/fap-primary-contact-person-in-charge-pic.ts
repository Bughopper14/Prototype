/** Mandatory-field rules of the FAP form: Primary Contact / Person in Charge (PIC). */
import {defineRules} from '@/shared/master-data/mandatory/rules/define-rules';

export const FAP_PRIMARY_CONTACT_PERSON_IN_CHARGE_PIC_RULES = defineRules(
  'FAP',
  'Primary Contact / Person in Charge (PIC)',
  [
    [31, 'picName', 'Contact Name', 0],
    [32, 'position', 'Position', 0],
    [33, 'phone', 'Phone Number', 0],
    [34, 'email', 'Email', 0],
    [35, 'country', 'Country', 0],
    [36, 'province', 'Province', 0],
    [37, 'city', 'City / Regency', 0],
    [38, 'district', 'District', 0],
    [39, 'village', 'Village / Sub-District', 0],
    [40, 'rt', 'RT', 0],
    [41, 'rw', 'RW', 0],
    [42, 'postalCode', 'Postal Code', 0],
    [43, 'currentAddress', 'Full Address', 0],
  ],
);
