import {inputLimits} from '@liugong/shared';
import {Plus, X} from 'lucide-react';
import {financialFields, blank, label} from '@liugong/shared';

export function FinancialEditor({
  rows,
  onChange,
  disabled,
}: {
  rows: any[];
  onChange: (r: any[]) => void;
  disabled: boolean;
}) {
  const change = (i: number, k: string, v: any) =>
    onChange(rows.map((r, j) => (j === i ? {...r, [k]: v} : r)));
  return (
    <>
      <div className="section-title">
        <span className="muted">Enter exact values; totals are checked when saved.</span>
        {!disabled && rows.length < 3 && (
          <button
            className="button small"
            onClick={() =>
              onChange([
                ...rows,
                {
                  ...blank(financialFields),
                  fiscalYear: new Date().getFullYear() - 3 + rows.length,
                  isAudited: false,
                },
              ])
            }
          >
            <Plus size={15} />
            Add fiscal year
          </button>
        )}
      </div>
      <div className="table-scroll">
        <table className="financial-table">
          <thead>
            <tr>
              <th>FINANCIAL METRIC</th>
              {rows.map((r, i) => (
                <th key={i}>
                  <div className="year-input">
                    <input
                      aria-label="Fiscal year"
                      type="number"
                      {...inputLimits('fiscalYear')}
                      disabled={disabled}
                      value={r.fiscalYear}
                      onChange={e => change(i, 'fiscalYear', e.target.value)}
                    />
                    {!disabled && (
                      <button
                        className="icon-button"
                        onClick={() => onChange(rows.filter((_, j) => j !== i))}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={r.isAudited}
                      onChange={e => change(i, 'isAudited', e.target.checked)}
                    />
                    Audited
                  </label>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {financialFields.map(f => (
              <tr
                key={f.key}
                className={f.key.startsWith('total') || f.key === 'netIncome' ? 'total-row' : ''}
              >
                <td>{f.label}</td>
                {rows.map((r, i) => (
                  <td key={i}>
                    <input
                      aria-label={`${r.fiscalYear} ${f.label}`}
                      type="number"
                      step="0.01"
                      disabled={disabled}
                      value={r[f.key]}
                      onChange={e => change(i, f.key, e.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
            <tr className="balance-row">
              <td>Balance check</td>
              {rows.map((r, i) => {
                const ok =
                  Number(r.currentAssets) + Number(r.nonCurrentAssets) === Number(r.totalAssets) &&
                  Number(r.currentLiabilities) + Number(r.nonCurrentLiabilities) ===
                    Number(r.totalLiabilities) &&
                  Number(r.totalAssets) === Number(r.totalLiabilities) + Number(r.equity) &&
                  Number(r.totalAssets) === Number(r.totalLiabAndEquity);
                return (
                  <td key={i}>
                    <span className={ok ? 'text-brand' : 'text-red'}>
                      {ok ? '✓ Balanced' : '! Unbalanced'}
                    </span>
                  </td>
                );
              })}
            </tr>
            {[
              ['Current ratio', 'currentAssets', 'currentLiabilities'],
              ['Debt / equity', 'totalLiabilities', 'equity'],
              ['Net profit margin', 'netIncome', 'revenue'],
            ].map(([name, n, d]) => (
              <tr key={name}>
                <td>{name}</td>
                {rows.map((r, i) => (
                  <td key={i} className="ratio">
                    {Number(r[d])
                      ? ((Number(r[n]) / Number(r[d])) * (name === 'Net profit margin' ? 100 : 1)).toFixed(
                          2,
                        ) + (name === 'Net profit margin' ? '%' : '×')
                      : 'N/A'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <div className="empty-small">Add three fiscal years to begin financial spreading.</div>
      )}
      <p className="field-note">
        DSCR is unavailable because the specification does not capture depreciation. Zero-denominator ratios
        are shown as N/A.
      </p>
    </>
  );
}
