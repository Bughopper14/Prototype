/** Mandatory-field rules of the Pre-Analysis form: Project Information. */
import {defineRules} from '@/shared/master-data/mandatory/rules/define-rules';

export const PRE_AN_PROJECT_INFORMATION_RULES = defineRules('PRE-AN', 'Project Information', [
  [62, 'holdingGroup', 'Holding Group / Parent Company', 0],
  [63, 'projectName', 'Project Name (Nama Objek Proyek)', 1],
  [64, 'projectLocation', 'Project Location (Lokasi Proyek)', 1],
  [65, 'customerRole', 'Role of Customer', 1],
  [66, 'otherContractors', 'Other Contractor work in same bowheer', 0],
  [67, 'projectStatus', 'Project Status', 1],
  [68, 'financingSchemeRequested', 'Financing Scheme Requested', 1],
]);
