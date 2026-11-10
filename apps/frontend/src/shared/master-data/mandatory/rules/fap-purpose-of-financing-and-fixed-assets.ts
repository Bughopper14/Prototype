/** Mandatory-field rules of the FAP form: Purpose of Financing & Fixed Assets. */
import {defineRules} from '@/shared/master-data/mandatory/rules/define-rules';

export const FAP_PURPOSE_OF_FINANCING_AND_FIXED_ASSETS_RULES = defineRules(
  'FAP',
  'Purpose of Financing & Fixed Assets',
  [
    [91, 'assetSummaryHeLiuGong', 'Fixed Asset - LiuGong Heavy Equipment', 0],
    [92, 'assetSummaryTruckLiuGong', 'Fixed Asset - LiuGong Truck', 0],
    [93, 'assetSummaryHeNonLiuGong', 'Fixed Asset - Non-LiuGong Heavy Equipment', 0],
    [94, 'assetSummaryTruckNonLiuGong', 'Fixed Asset - Non-LiuGong Truck', 0],
  ],
);
