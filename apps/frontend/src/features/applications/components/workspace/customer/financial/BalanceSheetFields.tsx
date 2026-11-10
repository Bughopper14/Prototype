/** Balance sheet (Neraca) inputs of the active year. */

export function BalanceSheetFields({
  canFinance,
  currentIndex,
  r,
  updateField,
  handleTriggerFieldSync,
}: {
  canFinance: boolean;
  currentIndex: number;
  r: any;
  updateField: (index: number, key: string, value: any) => void;
  handleTriggerFieldSync: (field: string, section?: string, extra?: any) => void;
}) {
  return (
    <div style={{background: '#f8fafc', padding: '14px', borderRadius: 8, border: '1px solid #e2e8f0'}}>
      <h4
        style={{
          margin: '0 0 12px',
          fontSize: '0.82rem',
          fontWeight: 700,
          color: '#1e40af',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Balance Sheet (Neraca)
      </h4>
      <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
        {[
          {key: 'currentAssets', label: 'Current Assets'},
          {key: 'nonCurrentAssets', label: 'Non-Current Assets'},
          {key: 'totalAssets', label: 'Total Assets', isTotal: true},
          {key: 'currentLiabilities', label: 'Current Liabilities'},
          {key: 'nonCurrentLiabilities', label: 'Non-Current Liabilities'},
          {key: 'totalLiabilities', label: 'Total Liabilities', isTotal: true},
          {key: 'equity', label: 'Equity'},
          {key: 'totalLiabAndEquity', label: 'Total Liabilities & Equity', isTotal: true},
        ].map(item => (
          <div
            key={item.key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <label
              style={{
                fontSize: '0.78rem',
                fontWeight: item.isTotal ? 700 : 500,
                color: item.isTotal ? '#0f172a' : '#334155',
                flex: 1,
              }}
            >
              {item.label}
            </label>
            <input
              type="number"
              data-field={item.key}
              className="input-field"
              style={{
                width: 150,
                textAlign: 'right',
                padding: '5px 8px',
                fontSize: '0.82rem',
                fontWeight: item.isTotal ? 700 : 400,
                background: item.isTotal ? '#ffffff' : '#ffffff',
                borderColor: item.isTotal ? '#93c5fd' : '#cbd5e1',
              }}
              disabled={!canFinance}
              value={r[item.key] ?? 0}
              onChange={e => {
                updateField(currentIndex, item.key, e.target.value);
                handleTriggerFieldSync(item.key, 'fap-preview-sec-financial', {
                  targetFinYear: currentIndex,
                });
              }}
              onFocus={() =>
                handleTriggerFieldSync(item.key, 'fap-preview-sec-financial', {
                  targetFinYear: currentIndex,
                })
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
