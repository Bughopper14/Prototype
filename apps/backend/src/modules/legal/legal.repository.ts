/** Legal data store (deeds and stakeholders): the parts live in ./store. */
export {initializeLegal} from './store/initialize';
export {readLegal} from './store/read';
export {saveLegal} from './store/save';
export {migrateStakeholderLocationNames} from './store/locations';
export {saveDeedReviewState} from './store/deed-review';
