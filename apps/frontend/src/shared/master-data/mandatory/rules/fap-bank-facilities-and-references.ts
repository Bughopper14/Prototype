/** Mandatory-field rules of the FAP form: Bank Facilities & References. */
import {defineRules} from '@/shared/master-data/mandatory/rules/define-rules';

export const FAP_BANK_FACILITIES_AND_REFERENCES_RULES = defineRules('FAP', 'Bank Facilities & References', [
  [95, 'bankOrFinInstitution', 'Bank or Financial Institution', 0],
  [96, 'currency', 'Bank Facility Currency', 0],
  [97, 'creditFacility', 'Credit Facility Limit', 0],
  [98, 'monthlyInstallment', 'Monthly Installment', 0],
  [99, 'yearStarted', 'Facility Year Started', 0],
  [100, 'interestRate', 'Facility Interest Rate', 0],
  [101, 'paymentRecord', 'Payment Record (Collectibility)', 0],
  [102, 'facilityStatus', 'Facility Status', 0],
  [103, 'referenceComments', 'Bank Reference Comments', 0],
]);
