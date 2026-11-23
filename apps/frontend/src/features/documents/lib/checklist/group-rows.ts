/** Groups the checklist rows by workflow stage, keeping the order in which the stages first appear. */
import type {ChecklistRow} from '@/features/documents/lib/checklist/types';

export interface StageGroup {
  code: string;
  name: string;
  rows: ChecklistRow[];
  availableCount: number;
}

export const NO_STAGE = 'NO_STAGE';

export function groupRowsByStage(rows: ChecklistRow[]): StageGroup[] {
  const groups = new Map<string, StageGroup>();
  for (const row of rows) {
    const code = row.stage || NO_STAGE;
    if (!groups.has(code)) groups.set(code, {code, name: row.stageName || 'Other', rows: [], availableCount: 0});
    const g = groups.get(code)!;
    g.rows.push(row);
    if (row.isAvailable) g.availableCount += 1;
  }
  return [...groups.values()];
}
