/** Mandatory-field rules of the Pre-Analysis form: Cross-Check with Dealer / LMI. */
import {defineRules} from '@/shared/master-data/mandatory/rules/define-rules';

export const PRE_AN_CROSS_CHECK_WITH_DEALER_LMI_RULES = defineRules(
  'PRE-AN',
  'Cross-Check with Dealer / LMI',
  [
    [81, 'dealerCheck', 'Dealer Payment & Performance Check', 1],
    [82, 'topDealerToCustomer', 'TOP Dealer to Customer', 0],
    [83, 'topLmiToDealer', 'TOP LMI to Dealer', 0],
    [84, 'lmiArCheck', 'LMI Internal AR Check', 1],
    [85, 'applicantPefindoCheck', 'Applicant Pefindo Check', 1],
  ],
);
