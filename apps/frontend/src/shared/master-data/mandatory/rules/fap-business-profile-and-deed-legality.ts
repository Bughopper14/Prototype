/** Mandatory-field rules of the FAP form: Business Profile & Deed Legality. */
import {defineRules} from '@/shared/master-data/mandatory/rules/define-rules';

export const FAP_BUSINESS_PROFILE_AND_DEED_LEGALITY_RULES = defineRules(
  'FAP',
  'Business Profile & Deed Legality',
  [
    [23, 'mainBusiness', 'Main Business', 0],
    [24, 'repaymentSource', 'Source of Repayment', 0],
    [25, 'industrySegment', 'Industry', 0],
    [26, 'businessRole', 'Business Role', 0],
    [27, 'experienceYears', 'Experience · Years', 1],
    [28, 'experienceMonths', 'Experience · Months', 1],
    [29, 'latestDeedNo', 'Latest Deed Number', 0],
    [30, 'latestDeedDate', 'Latest Deed Date', 0],
    [90, 'shareholderDeedRef', 'Shareholder Deed Reference', 0],
  ],
);
