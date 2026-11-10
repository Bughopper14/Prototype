/** Mandatory-field rules of the FAP form: Registration Office & Company Domicile. */
import {defineRules} from '@/shared/master-data/mandatory/rules/define-rules';

export const FAP_REGISTRATION_OFFICE_AND_COMPANY_DOMICILE_RULES = defineRules(
  'FAP',
  'Registration Office & Company Domicile',
  [
    [9, 'branchCode', 'Branch', 1],
    [10, 'customerStatus', 'Customer Relationship', 1],
    [11, 'locationStatus', 'Business Premises', 0],
    [12, 'companyAddress', 'Company Address', 1],
    [13, 'province', 'Province', 1],
    [14, 'city', 'City', 1],
    [15, 'district', 'District', 0],
    [16, 'village', 'Village / Sub-District', 0],
    [17, 'rt', 'RT', 0],
    [18, 'rw', 'RW', 0],
    [19, 'postalCode', 'Postal Code', 1],
    [20, 'phoneFax', 'Phone / Fax', 0],
    [21, 'email', 'Company Email', 0],
    [22, 'website', 'Website', 0],
  ],
);
