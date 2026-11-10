/** Mandatory-field rules of the Pre-Analysis form: Equipment Possibility of Success. */
import {defineRules} from '@/shared/master-data/mandatory/rules/define-rules';

export const PRE_AN_EQUIPMENT_POSSIBILITY_OF_SUCCESS_RULES = defineRules(
  'PRE-AN',
  'Equipment Possibility of Success',
  [
    [73, 'equipmentJobFit', 'Equipment-to-Job Fit', 1],
    [74, 'utilizationDuration', 'Utilization vs Project Duration', 1],
    [75, 'priorLiugongExperience', 'Prior LiuGong Experience', 0],
    [76, 'serviceAgreementFmc', 'Have Service Agreement / FMC', 1],
  ],
);
