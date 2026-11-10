/** Income statement (Laba Rugi) inputs of the active year. */

export function IncomeStatementFields({
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
          color: '#047857',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Income Statement (Laba Rugi)
      </h4>
      <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
        {[
          {key: 'revenue', label: 'Revenue'},
          {key: 'grossMargin', label: 'Gross Profit'},
          {key: 'operatingMargin', label: 'Operating Profit (EBIT)'},
          {key: 'tax', label: 'Tax'},
          {key: 'netIncome', label: 'Net Income', isTotal: true},
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
                borderColor: item.isTotal ? '#86efac' : '#cbd5e1',
              }}
              disabled={!canFinance}
              value={r[item.key] === 0 || r[item.key] === '0' || r[item.key] === '0.00' ? '' : (r[item.key] ?? '')}
              placeholder="0"
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
