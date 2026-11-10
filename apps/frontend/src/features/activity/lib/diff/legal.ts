/** Changes found in: Legal deeds. */
import type {DiffContext} from '@/features/activity/lib/diff/types';
import {cleanVal} from '@/features/activity/lib/diff/format';

export function diffLegal({beforeApp, draft, changes}: DiffContext) {
  const oldLegal = beforeApp.legal || {};
  const newLegal = draft.legal || {};
  const checkLegal = (subSection: string, label: string, field: string, oldVal: any, newVal: any) => {
    const sOld = cleanVal(oldVal);
    const sNew = cleanVal(newVal);
    if (sOld !== sNew) {
      changes.push({
        section: 'Legal',
        subSection,
        field,
        label,
        oldValue: sOld || '(kosong)',
        newValue: sNew || '(kosong)',
      });
    }
  };
  checkLegal(
    'Deed Review & Notary Records',
    'Nomor Akta Terakhir',
    'latestDeedNo',
    oldLegal.latestDeedNo,
    newLegal.latestDeedNo || draft.latestDeedNo,
  );
  checkLegal(
    'Deed Review & Notary Records',
    'Tanggal Akta Terakhir',
    'latestDeedDate',
    oldLegal.latestDeedDate,
    newLegal.latestDeedDate || draft.latestDeedDate,
  );
}
