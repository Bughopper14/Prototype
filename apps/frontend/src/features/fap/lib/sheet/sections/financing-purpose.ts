/** Financing purpose checkboxes: one sheet cell (param_key) per option of Master Data. */
import type {MasterCatalog} from '@liugong/shared';
import type {SheetValues} from '@/features/fap/lib/sheet/sheet-values';
import type {CellWriters} from '@/features/fap/lib/sheet/cell-writers';

export function applyFinancingPurpose({
  d,
  setText,
  master,
}: {
  d: SheetValues;
  setText: CellWriters['setText'];
  master: MasterCatalog;
}) {
  const raw = (d as any).financingPurposeDetail;
  const selected = new Set(
    (Array.isArray(raw) ? raw : String(raw || '').split(','))
      .map((s: any) => String(s).trim().toUpperCase())
      .filter(Boolean),
  );
  for (const option of master.financingPurposeOption || [])
    if (option.paramKey) setText(option.paramKey, selected.has(option.value) ? '✓' : '');
}
