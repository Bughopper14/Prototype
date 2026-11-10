/** Balance check and the key ratios of the active year. */

export function RatiosBar({
  isBalanced,
  curRatio,
  debtEquity,
  netMargin,
}: {
  isBalanced: boolean;
  curRatio: string;
  debtEquity: string;
  netMargin: string;
}) {
  return (
    <div
      style={{
        background: '#f1f5f9',
        border: '1px solid #cbd5e1',
        borderRadius: 8,
        padding: '12px 16px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        alignItems: 'center',
      }}
    >
      <div>
        <span style={{fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: 2}}>
          Balance check
        </span>
        <span
          style={{
            fontSize: '0.85rem',
            fontWeight: 700,
            color: isBalanced ? '#2563eb' : '#dc2626',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {isBalanced ? '✓ Balanced' : '⚠️ Unbalanced'}
        </span>
      </div>
      <div>
        <span style={{fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: 2}}>
          Current ratio
        </span>
        <span style={{fontSize: '0.85rem', fontWeight: 700, color: '#1e293b'}}>{curRatio}</span>
      </div>
      <div>
        <span style={{fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: 2}}>
          Debt / equity
        </span>
        <span style={{fontSize: '0.85rem', fontWeight: 700, color: '#1e293b'}}>{debtEquity}</span>
      </div>
      <div>
        <span style={{fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: 2}}>
          Net profit margin
        </span>
        <span style={{fontSize: '0.85rem', fontWeight: 700, color: '#1e293b'}}>{netMargin}</span>
      </div>
    </div>
  );
}
