/** Shareholders table, up to 8 rows. */
import type {SheetValues} from '@/features/fap/lib/sheet/sheet-values';
import type {CellWriters} from '@/features/fap/lib/sheet/cell-writers';
import {formatStakeholderPosition} from '@liugong/shared';

export function applyShareholders({d, setText}: {d: SheetValues; setText: CellWriters['setText']}) {
  // Shareholders up to 8
  const shList = d.stakeholders || [];

  for (let i = 0; i < 8; i++) {
    const item = shList[i] || {};
    const shName = item.name || [item.firstName, item.middleName, item.lastName].filter(Boolean).join(' ');
    const shareVal =
      item.depositedCapital || item.primaryCapital || item.shareAmount || item.shares || item.amount;
    const pctVal =
      item.sharePercentage !== undefined && item.sharePercentage !== null && item.sharePercentage !== ''
        ? item.sharePercentage
        : item.sharePercent || item.percent || item.percentage;
    setText(`fap-cell-sh-${i}-name`, shName || '');
    setText(`fap-cell-sh-${i}-pos`, formatStakeholderPosition(item.positions || item.position));
    setText(
      `fap-cell-sh-${i}-shares`,
      shareVal !== undefined && shareVal !== null && shareVal !== ''
        ? Number(shareVal).toLocaleString('id-ID')
        : '',
    );
    setText(
      `fap-cell-sh-${i}-pct`,
      pctVal !== undefined && pctVal !== null && pctVal !== '' ? `${pctVal}%` : '',
    );
  }
}
