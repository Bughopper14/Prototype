/** Mandatory-field rules of the FAP form: Industry Segmentation & Active Projects. */
import {defineRules} from '@/shared/master-data/mandatory/rules/define-rules';

export const FAP_INDUSTRY_SEGMENTATION_AND_ACTIVE_PROJECTS_RULES = defineRules(
  'FAP',
  'Industry Segmentation & Active Projects',
  [
    [44, 'projectOwner', 'Project Owner', 0],
    [45, 'projectLocation', 'Location', 1],
    [46, 'projectRole', 'Role In Project', 0],
    [47, 'contractStatus', 'Contract Status', 0],
  ],
);
