/** Mandatory-field rules of the Pre-Analysis form: Customer & Group Background. */
import {defineRules} from '@/shared/master-data/mandatory/rules/define-rules';

export const PRE_AN_CUSTOMER_AND_GROUP_BACKGROUND_RULES = defineRules(
  'PRE-AN',
  'Customer & Group Background',
  [
    [69, 'companyBackground', 'Company Background', 0],
    [70, 'uboInfo', 'Ultimate Beneficial Owner (UBO)', 0],
    [71, 'businessDevBackground', 'Business Development Background', 0],
    [72, 'existingFincoBackup', 'Existing Finco Backup', 1],
  ],
);
