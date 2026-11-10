/** Changes found in: Stakeholders. */
import type {DiffContext} from '@/features/activity/lib/diff/types';
import {cleanVal} from '@/features/activity/lib/diff/format';

export function diffStakeholders({beforeApp, draft, changes}: DiffContext) {
  const oldStakeholders = Array.isArray(beforeApp.stakeholders) ? beforeApp.stakeholders : [];
  const newStakeholders = Array.isArray(draft.stakeholders) ? draft.stakeholders : [];
  if (oldStakeholders.length !== newStakeholders.length) {
    changes.push({
      section: 'Stakeholders',
      subSection: 'Shareholders & Stakeholder Register',
      field: 'stakeholderCount',
      label: 'Total Stakeholders',
      oldValue: `${oldStakeholders.length} orang / badan`,
      newValue: `${newStakeholders.length} orang / badan`,
    });
  }
  newStakeholders.forEach((ns: any, idx: number) => {
    const match = oldStakeholders.find((os: any) => os.id === ns.id || (os.name && os.name === ns.name));
    if (!match) {
      changes.push({
        section: 'Stakeholders',
        subSection: 'Shareholders & Stakeholder Register',
        field: 'newStakeholder',
        label: `Pemegang Saham Baru #${idx + 1}`,
        oldValue: '(belum ada)',
        newValue: `${ns.name || 'Unnamed'} (${ns.sharePercentage || ns.shares || 0}%, ${ns.position || 'Shareholder'})`,
      });
    } else if (
      cleanVal(match.sharePercentage || match.shares) !== cleanVal(ns.sharePercentage || ns.shares)
    ) {
      changes.push({
        section: 'Stakeholders',
        subSection: 'Shareholders & Stakeholder Register',
        field: 'sharePercentage',
        label: `Persentase Saham (${ns.name || 'Shareholder'})`,
        oldValue: `${match.sharePercentage || match.shares || 0}%`,
        newValue: `${ns.sharePercentage || ns.shares || 0}%`,
      });
    }
  });
}
