/** Pre-Analysis data store: the parts live in ./store. */
export {
  romanMonths,
  getRomanMonthFromDate,
  generatePreAnalysisNo,
  getAllPreAnalysisNumbers,
} from './store/numbering';
export {DEFAULT_COMPETITION_TABLE, DEFAULT_GROUP_STRUCTURE} from './store/group-structure';
export type {GroupShareholder, GroupEntity, GroupStructureData} from './store/group-structure';
export {createBlankPreAnalysisData, DEFAULT_PRE_ANALYSIS_DATA} from './store/defaults';
export {initPreAnalysisStore, getPreAnalysisData, savePreAnalysisData} from './store/persistence';
