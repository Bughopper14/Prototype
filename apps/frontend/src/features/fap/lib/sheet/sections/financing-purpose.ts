/** Financing purpose checkboxes. */
import type {SheetValues} from '@/features/fap/lib/sheet/sheet-values';
import type {CellWriters} from '@/features/fap/lib/sheet/cell-writers';

export function applyFinancingPurpose({d, setText}: {d: SheetValues; setText: CellWriters['setText']}) {
  // Financing Purpose Checkboxes
  const rawPurpose = (d as any).financingPurposeDetail;

  const purposeList = Array.isArray(rawPurpose)
    ? rawPurpose.map((s: any) => String(s).toUpperCase())
    : String(rawPurpose || '')
        .split(',')
        .map((s: string) => s.trim().toUpperCase());

  const facilityPurp = String((d as any).facilityPurpose || '').toUpperCase();

  const isBiz = purposeList.some(
    (p: string) => p.includes('BUSINESS') || p.includes('USAHA') || p.includes('AKTIVITAS'),
  );

  const isRehab = purposeList.some((p: string) => p.includes('REHAB'));

  const isExp = purposeList.some(
    (p: string) => p.includes('EXPANSION') || p.includes('MODERNISASI') || p.includes('EKSPANSI'),
  );

  const isReloc = purposeList.some((p: string) => p.includes('RELOCATION') || p.includes('RELOKASI'));

  const isWorkCap =
    purposeList.some(
      (p: string) =>
        p.includes('WORKING') ||
        p.includes('MODAL_KERJA') ||
        p.includes('MODAL KERJA') ||
        p.includes('SIKLUS'),
    ) || facilityPurp === 'WORKING_CAPITAL';

  setText('fap-cell-purpose-business', isBiz ? '✓' : '');

  setText('fap-cell-purpose-rehab', isRehab ? '✓' : '');

  setText('fap-cell-purpose-expansion', isExp ? '✓' : '');

  setText('fap-cell-purpose-relocation', isReloc ? '✓' : '');

  setText('fap-cell-purpose-working-cap', isWorkCap ? '✓' : '');
}
