/** What every tab's diff gets to look at, and where it records the changes it finds. */
import type {ActivityChangeItem} from '@/features/activity/lib/types';

export interface DiffContext {
  beforeApp: any;
  draft: any;
  customerPayload: any;
  customerDraft: any;
  resolvedName?: string;
  customerCategory?: string;
  changes: ActivityChangeItem[];
  activeSectionName: string;
}
