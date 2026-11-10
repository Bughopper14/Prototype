/** Changes found in: Business and bank references. */
import type {DiffContext} from '@/features/activity/lib/diff/types';

export function diffBusinessBanks({beforeApp, draft, changes}: DiffContext) {
  const oldSegment = beforeApp.industrySegment || '';
  const newSegment = draft.industrySegment || '';
  if (oldSegment && newSegment && oldSegment !== newSegment) {
    changes.push({
      section: 'Business & banks',
      subSection: 'Business Profile',
      field: 'industrySegment',
      label: 'Industry Segment',
      oldValue: oldSegment,
      newValue: newSegment,
    });
  }
  const oldBanks = Array.isArray(beforeApp.bankReferences) ? beforeApp.bankReferences : [];
  const newBanks = Array.isArray(draft.bankReferences) ? draft.bankReferences : [];
  if (oldBanks.length !== newBanks.length) {
    changes.push({
      section: 'Business & banks',
      subSection: 'Bank Facilities',
      field: 'bankReferences',
      label: 'Jumlah Fasilitas Bank',
      oldValue: `${oldBanks.length} fasilitas`,
      newValue: `${newBanks.length} fasilitas`,
    });
  }
}
