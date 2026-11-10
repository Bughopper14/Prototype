/** Mandatory-field rules of the FAP form: Debtor Identity & Classification. */
import {defineRules} from '@/shared/master-data/mandatory/rules/define-rules';

export const FAP_DEBTOR_IDENTITY_AND_CLASSIFICATION_RULES = defineRules(
  'FAP',
  'Debtor Identity & Classification',
  [
    [1, 'customerCategory', 'Customer Category', 0],
    [2, 'companyName', 'Company Name', 1],
    [3, 'companyType', 'Business Category', 1],
    [4, 'nib', 'NIB', 1],
    [5, 'nibDate', 'NIB Established Date', 0],
    [6, 'npwp', 'NPWP', 1],
    [7, 'establishmentActNo', 'Establishment Deed Number', 1],
    [8, 'establishmentDate', 'Establishment Deed Date', 1],
  ],
);
