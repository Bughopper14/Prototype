/** Mandatory-field rules of the Pre-Analysis form: Expert Judgement Conclusion. */
import {defineRules} from '@/shared/master-data/mandatory/rules/define-rules';

export const PRE_AN_EXPERT_JUDGEMENT_CONCLUSION_RULES = defineRules('PRE-AN', 'Expert Judgement Conclusion', [
  [86, 'recommendation', 'Credit Recommendation', 1],
  [87, 'proposedBy', 'Proposed By (Pengusul)', 1],
  [88, 'reviewedBy', 'Reviewed By (Reviewer)', 1],
  [89, 'approvedBy', 'Approved By (Approver)', 1],
]);
