/** Group structure → narrative text for the report. */
import {GroupStructureData} from './types';

export function formatGroupStructureAsNarrative(gs: GroupStructureData): string {
  if (!gs || !gs.holding) return '';
  const lines: string[] = [];
  const hName = gs.holding.name || 'Holding Company';
  const hCap = `Authorized Capital: ${gs.holding.authorizedCapital || '-'}, Paid-up Capital: ${gs.holding.paidUpCapital || '-'}`;
  lines.push(`CORPORATE SHAREHOLDING & GOVERNANCE STRUCTURE:`);
  lines.push(
    `• ${hName} (Parent Holding): Authorized Capital: ${gs.holding.authorizedCapital || '-'}, Paid-up Capital: ${gs.holding.paidUpCapital || '-'}`,
  );
  (gs.holding.shareholders || []).forEach(sh => {
    if (sh.name) {
      lines.push(`  - ${sh.name} (${sh.percentage || '-'}${sh.role ? ` - ${sh.role}` : ''})`);
    }
  });
  if (gs.holding.management) {
    lines.push(`  - Management: ${gs.holding.management}`);
  }
  (gs.subsidiaries || []).forEach(sub => {
    if (sub.name) {
      const sCap = `Authorized Capital: ${sub.authorizedCapital || '-'}, Paid-up Capital: ${sub.paidUpCapital || '-'}`;
      lines.push(`• ${sub.name}: ${sCap}`);
      (sub.shareholders || []).forEach(sh => {
        if (sh.name) {
          lines.push(`  - ${sh.name} (${sh.percentage || '-'}${sh.role ? ` - ${sh.role}` : ''})`);
        }
      });
      if (sub.management) {
        lines.push(`  - Management: ${sub.management}`);
      }
    }
  });
  return lines.join('\n');
}
