/** Mandatory-field rules of the FAP form: Legal Deeds & Amendments. */
import {defineRules} from '@/shared/master-data/mandatory/rules/define-rules';

export const FAP_LEGAL_DEEDS_AND_AMENDMENTS_RULES = defineRules('FAP', 'Legal Deeds & Amendments', [
  [157, 'deedNumber', 'Deed Number', 0],
  [158, 'deedDate', 'Deed Date', 0],
  [159, 'notaryName', 'Notary Name', 0],
  [160, 'notaryCity', 'Notary City', 0],
  [161, 'decreeNumber', 'Ministerial Decree Number', 0],
  [162, 'decreeDate', 'Ministerial Decree Date', 0],
  [171, 'type', 'Deed Type', 0],
  [172, 'ministerialDecreeNumber', 'Ministerial Decree Number', 0],
  [173, 'ministerialDecreeDate', 'Ministerial Decree Date', 0],
  [174, 'remarks', 'Deed Notes / Remarks', 0],
]);
