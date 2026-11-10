/** Field-by-field diff of two application snapshots, used for the activity feed. */
import {ActivityChangeItem} from './types';
import {diffCustomerPic} from '@/features/activity/lib/diff/customer-pic';
import {diffStakeholders} from '@/features/activity/lib/diff/stakeholders';
import {diffBusinessBanks} from '@/features/activity/lib/diff/business-banks';
import {diffFinancingUnits} from '@/features/activity/lib/diff/financing-units';
import {diffFinancialStatements} from '@/features/activity/lib/diff/financial-statements';
import {diffLegal} from '@/features/activity/lib/diff/legal';
import {diffPreAnalysis} from '@/features/activity/lib/diff/pre-analysis';

/**
 * Computes exact field diffs between before-state and after-state of an application
 */
export function computeApplicationDiff(params: {
  tab: number;
  beforeApp: any;
  draft: any;
  customerPayload?: any;
  customerDraft?: any;
  resolvedName?: string;
  customerCategory?: string;
}): {
  changes: ActivityChangeItem[];
  details: string;
  summaryTitle: string;
} {
  const {
    tab,
    beforeApp = {},
    draft = {},
    customerPayload = {},
    customerDraft = {},
    resolvedName,
    customerCategory,
  } = params;
  const changes: ActivityChangeItem[] = [];
  const tabNamesList: Record<number, string> = {
    0: 'Customer & PIC',
    1: 'Stakeholders',
    2: 'Business & banks',
    3: 'Financing & units',
    4: 'Financial statements',
    5: 'Legal',
    6: 'Documents',
    8: 'Pre Analysis form',
  };
  const activeSectionName = tabNamesList[tab] || 'Application details';

  const ctx = {
    beforeApp,
    draft,
    customerPayload,
    customerDraft,
    resolvedName,
    customerCategory,
    changes,
    activeSectionName,
  };
  switch (tab) {
    case 0:
      diffCustomerPic(ctx);
      break;
    case 1:
      diffStakeholders(ctx);
      break;
    case 2:
      diffBusinessBanks(ctx);
      break;
    case 3:
      diffFinancingUnits(ctx);
      break;
    case 4:
      diffFinancialStatements(ctx);
      break;
    case 5:
      diffLegal(ctx);
      break;
    case 8:
      diffPreAnalysis(ctx);
      break;
  }

  // Construct structured text details snippet
  let details = '';
  if (changes.length > 0) {
    const fieldSummaries = changes.map(
      c =>
        `Bagian ${c.section || activeSectionName} › Sub Section "${c.subSection || 'General'}" › Kolom "${c.label}": diubah dari "${c.oldValue}" menjadi "${c.newValue}"`,
    );
    details = fieldSummaries.slice(0, 3).join(' | ');
    if (changes.length > 3) {
      details += ` | dan ${changes.length - 3} perubahan kolom lainnya`;
    }
  } else {
    details = `Penyimpanan data pada bagian ${activeSectionName} (tidak ada nilai kolom yang dimodifikasi).`;
  }

  const summaryTitle =
    changes.length > 0
      ? `Perubahan Data ${activeSectionName} (${changes.length} kolom)`
      : `Updated ${activeSectionName}`;

  return {
    changes,
    details,
    summaryTitle,
  };
}
