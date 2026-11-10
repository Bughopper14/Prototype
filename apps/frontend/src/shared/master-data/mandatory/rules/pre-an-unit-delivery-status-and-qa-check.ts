/** Mandatory-field rules of the Pre-Analysis form: Unit Delivery Status & QA Check. */
import {defineRules} from '@/shared/master-data/mandatory/rules/define-rules';

export const PRE_AN_UNIT_DELIVERY_STATUS_AND_QA_CHECK_RULES = defineRules(
  'PRE-AN',
  'Unit Delivery Status & QA Check',
  [
    [77, 'deliveryStatus', 'Delivery Status', 1],
    [78, 'deliveryDate', 'Delivery Date', 0],
    [79, 'qaIlinkComment', 'QA Comment — iLink/GPS Check', 0],
    [80, 'qaConclusion', 'QA Conclusion', 1],
  ],
);
