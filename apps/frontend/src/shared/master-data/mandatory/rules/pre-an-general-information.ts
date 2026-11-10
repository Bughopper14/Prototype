/** Mandatory-field rules of the Pre-Analysis form: General Information. */
import {defineRules} from '@/shared/master-data/mandatory/rules/define-rules';

export const PRE_AN_GENERAL_INFORMATION_RULES = defineRules('PRE-AN', 'General Information', [
  [48, 'preAnalysisNo', 'Pre-Analysis No', 1],
  [49, 'preAnalysisDate', 'Pre-Analysis Date', 1],
  [50, 'customerProjectName', 'Customer / Project Name', 1],
  [51, 'taxId', 'Tax ID (NPWP)', 1],
  [52, 'fapNumber', 'FAP Number', 1],
  [53, 'leadSource', 'Lead Source', 1],
  [54, 'customerArea', 'Customer Area', 1],
  [55, 'dealerPic', 'Dealer PIC', 1],
  [56, 'lmiPic', 'LMI PIC', 1],
  [57, 'lfiPic', 'LFI PIC', 1],
  [58, 'customerPic', 'Customer PIC', 1],
  [59, 'equity', 'Equity', 0],
  [60, 'paidUpCapital', 'Paid up Capital', 0],
  [61, 'sourceOfRepayment', 'Source of Repayment', 1],
]);
