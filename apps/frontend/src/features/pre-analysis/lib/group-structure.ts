/** Default group structure and its text form. */
import type {GroupStructureData} from '@/features/pre-analysis/lib/types';

export const DEFAULT_GROUP_STRUCTURE: GroupStructureData = {
  holding: {
    name: 'PT STAR',
    subtitle: '(PT Santosa Abadi Raja)',
    authorizedCapital: 'Rp. 240,000,000,000',
    paidUpCapital: 'Rp. 60,000,000,000',
    borderColor: '#1e3a8a',
    shareholders: [
      {
        name: 'HANSEN SANTOSA',
        position: 'President Director',
        role: 'President Director',
        shareClass: '-',
        numberOfShares: '324,000',
        total: 'Rp. 32,400,000,000',
        percentage: '54%',
      },
      {
        name: 'LEONARD SANTOSA',
        position: 'Director',
        role: 'Director',
        shareClass: '-',
        numberOfShares: '204,000',
        total: 'Rp. 20,400,000,000',
        percentage: '34%',
      },
      {
        name: 'OKY SANTOSA',
        position: 'Commissioner',
        role: 'Commissioner',
        shareClass: '-',
        numberOfShares: '72,000',
        total: 'Rp. 7,200,000,000',
        percentage: '12%',
      },
    ],
    management: 'Presdir: Hansen Santosa | Direktur: Leonard Santosa | Komisaris: Oky Santosa',
  },
  subsidiaries: [
    {
      name: 'PT PASS',
      subtitle: '(PT Pangan Sejahtera Santosa)',
      authorizedCapital: 'Rp. 50,000,000,000',
      paidUpCapital: 'Rp. 17,500,000,000',
      borderColor: '#0284c7',
      shareholders: [
        {
          name: 'LEONARD SANTOSA',
          position: 'Director',
          role: 'Director',
          shareClass: '-',
          numberOfShares: '10',
          total: 'Rp. 1,000,000',
          percentage: '<1%',
        },
        {
          name: 'HANSEN SANTOSA',
          position: 'Commissioner',
          role: 'Commissioner',
          shareClass: '-',
          numberOfShares: '-',
          total: 'Rp. 0',
          percentage: '0%',
        },
        {
          name: 'PT SANTOSA ABADI RAJA',
          position: 'Legal Entity',
          role: 'Legal Entity',
          shareClass: '-',
          numberOfShares: '174,990',
          total: 'Rp. 17,499,000,000',
          percentage: '99.99%',
        },
      ],
      management: 'Direktur: Leonard Santosa | Komisaris: Hansen Santosa',
    },
    {
      name: 'PT HPS',
      subtitle: '(PT Handalan Putra Santosa)',
      authorizedCapital: 'Rp. 130,000,000,000',
      paidUpCapital: 'Rp. 32,500,000,000',
      borderColor: '#dc2626',
      shareholders: [
        {
          name: 'LEONARD SANTOSA',
          position: 'Director',
          role: 'Director',
          shareClass: '-',
          numberOfShares: '10',
          total: 'Rp. 1,000,000',
          percentage: '<1%',
        },
        {
          name: 'HANSEN SANTOSA',
          position: 'Commissioner',
          role: 'Commissioner',
          shareClass: '-',
          numberOfShares: '-',
          total: 'Rp. 0',
          percentage: '0%',
        },
        {
          name: 'PT SANTOSA ABADI RAJA',
          position: 'Legal Entity',
          role: 'Legal Entity',
          shareClass: '-',
          numberOfShares: '324,990',
          total: 'Rp. 32,499,000,000',
          percentage: '99.99%',
        },
      ],
      management: 'Direktur: Leonard Santosa | Komisaris: Hansen Santosa',
    },
    {
      name: 'PT HTPS',
      subtitle: '(PT Harta Putramas Santosa)',
      authorizedCapital: 'Rp. 500,000,000',
      paidUpCapital: 'Rp. 500,000,000',
      borderColor: '#16a34a',
      shareholders: [
        {
          name: 'HANSEN SANTOSA',
          position: 'Commissioner',
          role: 'Commissioner',
          shareClass: '-',
          numberOfShares: '-',
          total: 'Rp. 0',
          percentage: '0%',
        },
        {
          name: 'LEONARD SANTOSA',
          position: 'Director',
          role: 'Director',
          shareClass: '-',
          numberOfShares: '1',
          total: 'Rp. 100,000',
          percentage: '<1%',
        },
        {
          name: 'PT SANTOSA ABADI RAJA',
          position: 'Legal Entity',
          role: 'Legal Entity',
          shareClass: '-',
          numberOfShares: '4,999',
          total: 'Rp. 499,900,000',
          percentage: '99.98%',
        },
      ],
      management: 'Komisaris: Hansen Santosa | Direktur: Leonard Santosa',
    },
  ],
};

export function formatGroupStructureAsNarrative(gs: GroupStructureData): string {
  if (!gs || !gs.holding) return '';
  const lines: string[] = [];
  const hName = gs.holding.name || 'Holding Company';
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
