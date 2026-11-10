/** Customer section 09: Financial Statements. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {money} from '@/shared/lib/format';
import {blank, financialFields} from '@liugong/shared';
import {ChevronDown, ChevronLeft, ChevronRight, Eye, Plus, Trash2} from 'lucide-react';

export function FinancialStatementsSection() {
  const {
    draft,
    setDraft,
    openSections,
    setOpenSections,
    handleTriggerFieldSync,
    handleTriggerSync,
    toggleSection,
    canFinance,
    financialActiveIndex,
    setFinancialActiveIndex,
  } = useWorkspace();

  const rows = draft.financialStatements || [];
  const maxRows = 3;
  const currentIndex = Math.min(financialActiveIndex, Math.max(rows.length - 1, 0));

  const addFiscalYear = () => {
    if (rows.length >= maxRows) return;
    const existingYears = rows.map((r: any) => Number(r.fiscalYear) || 0).filter((y: number) => y > 0);
    const currentYear = new Date().getFullYear();
    const newYear = existingYears.length > 0 ? Math.max(...existingYears) + 1 : currentYear - 1;
    const newRow = {
      ...blank(financialFields),
      fiscalYear: newYear,
      isAudited: false,
    };
    const nextRows = [...rows, newRow];
    setDraft({...draft, financialStatements: nextRows});
    setFinancialActiveIndex(nextRows.length - 1);
  };

  const removeFiscalYear = (index: number) => {
    const nextRows = rows.filter((_: any, j: number) => j !== index);
    setDraft({...draft, financialStatements: nextRows});
    setFinancialActiveIndex(Math.min(currentIndex, Math.max(nextRows.length - 1, 0)));
  };

  const updateField = (index: number, key: string, value: any) => {
    const updated = rows.map((r: any, j: number) => {
      if (j !== index) return r;
      const newRow = {...r, [key]: value};
      if (key === 'currentAssets' || key === 'nonCurrentAssets') {
        newRow.totalAssets = (Number(newRow.currentAssets) || 0) + (Number(newRow.nonCurrentAssets) || 0);
      }
      if (key === 'currentLiabilities' || key === 'nonCurrentLiabilities') {
        newRow.totalLiabilities =
          (Number(newRow.currentLiabilities) || 0) + (Number(newRow.nonCurrentLiabilities) || 0);
        newRow.totalLiabAndEquity = (Number(newRow.totalLiabilities) || 0) + (Number(newRow.equity) || 0);
      }
      if (key === 'equity') {
        newRow.totalLiabAndEquity = (Number(newRow.totalLiabilities) || 0) + (Number(newRow.equity) || 0);
      }
      return newRow;
    });
    setDraft({...draft, financialStatements: updated});
  };

  const r = rows[currentIndex] || {};

  return (
    <div
      className={`fap-accordion-card ${openSections['fap-preview-sec-financial'] ? 'is-open' : 'is-closed'}`}
      id="acc-fap-preview-sec-financial"
      data-section="financial"
    >
      <div className="fap-accordion-header" onClick={() => toggleSection('fap-preview-sec-financial')}>
        <div className="fap-acc-header-left">
          <span className="fap-acc-step-badge">09</span>
          <div className="fap-acc-titles">
            <div className="fap-acc-title-row">
              <h4 className="fap-acc-title">Financial Statements</h4>
              <span className={`fap-acc-badge ${rows.length > 0 ? 'success' : ''}`}>
                {rows.length} Fiscal Years
              </span>
            </div>
            <p className="fap-acc-subtitle">Three years of financial performance. All figures in IDR (Max. 3 fiscal years)</p>
          </div>
        </div>
        <div className="fap-acc-header-right">
          <button
            type="button"
            className="fap-acc-sync-btn"
            title="Sync preview document to this section"
            onClick={e => {
              e.stopPropagation();
              handleTriggerSync('fap-preview-sec-financial');
              setOpenSections(s => ({...s, ['fap-preview-sec-financial']: true}));
            }}
          >
            <Eye size={12} /> Sync View
          </button>
          <span className={`fap-acc-chevron ${openSections['fap-preview-sec-financial'] ? 'rotate' : ''}`}>
            <ChevronDown size={17} />
          </span>
        </div>
      </div>
      {openSections['fap-preview-sec-financial'] && (
        <div className="fap-accordion-content">
          <div className="section-title" style={{marginBottom: 12}}>
            <span className="muted" style={{fontSize: '0.8rem'}}>
              Carousel format · Maximum 3 fiscal years (Audited vs In-house). All monetary values in IDR.
            </span>
            {canFinance && rows.length < maxRows && (
              <button type="button" className="button small" onClick={addFiscalYear}>
                <Plus size={14} /> Add Fiscal Year
              </button>
            )}
          </div>

          {rows.length === 0 ? (
            <div className="empty-small">
              No financial statements recorded yet.
              {canFinance && (
                <button
                  type="button"
                  className="button small"
                  style={{display: 'inline-block', marginLeft: 10}}
                  onClick={addFiscalYear}
                >
                  <Plus size={13} /> Add First Year
                </button>
              )}
            </div>
          ) : (
            <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
              {/* Carousel Navigation Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#f8fafc',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <button
                  type="button"
                  className="button small"
                  disabled={currentIndex <= 0}
                  onClick={() => setFinancialActiveIndex(Math.max(0, currentIndex - 1))}
                  style={{display: 'flex', alignItems: 'center', gap: 4}}
                >
                  <ChevronLeft size={14} /> Previous Year
                </button>

                <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                    <span style={{fontSize: '0.8rem', fontWeight: 600, color: '#334155'}}>Tahun / Year:</span>
                    <input
                      type="number"
                      data-field="fiscalYear"
                      disabled={!canFinance}
                      value={r.fiscalYear || ''}
                      onChange={e => updateField(currentIndex, 'fiscalYear', parseInt(e.target.value, 10) || '')}
                      onFocus={() => handleTriggerFieldSync('fiscalYear', `fin-${currentIndex}`)}
                      style={{
                        width: 70,
                        padding: '3px 6px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        borderRadius: 4,
                        border: '1px solid #cbd5e1',
                        textAlign: 'center',
                      }}
                    />
                  </div>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: r.isAudited ? '#1e40af' : '#475569',
                      background: r.isAudited ? '#eff6ff' : 'transparent',
                      padding: '3px 8px',
                      borderRadius: 4,
                      border: `1px solid ${r.isAudited ? '#93c5fd' : '#cbd5e1'}`,
                      cursor: canFinance ? 'pointer' : 'default',
                    }}
                    onClick={() => {
                      if (!canFinance) return;
                      updateField(currentIndex, 'isAudited', !r.isAudited);
                      handleTriggerFieldSync('financialAudited', `fin-${currentIndex}`);
                    }}
                  >
                    <input
                      type="checkbox"
                      data-field="financialAudited"
                      disabled={!canFinance}
                      checked={Boolean(r.isAudited)}
                      onChange={() => {}}
                      style={{accentColor: '#2563eb', cursor: canFinance ? 'pointer' : 'default'}}
                    />
                    <span>Audited</span>
                  </label>

                  <span style={{fontSize: '0.78rem', color: '#64748b'}}>
                    ({currentIndex + 1} of {rows.length})
                  </span>
                </div>

                <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                  <button
                    type="button"
                    className="button small"
                    disabled={currentIndex >= rows.length - 1}
                    onClick={() => setFinancialActiveIndex(Math.min(rows.length - 1, currentIndex + 1))}
                    style={{display: 'flex', alignItems: 'center', gap: 4}}
                  >
                    Next Year <ChevronRight size={14} />
                  </button>
                  {canFinance && (
                    <button
                      type="button"
                      className="button small danger"
                      title="Hapus tahun buku ini"
                      onClick={() => removeFiscalYear(currentIndex)}
                      style={{padding: '5px 8px'}}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Balance Sheet & Income Statement Grids */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '14px',
                  alignItems: 'start',
                }}
              >
                {/* Balance Sheet (Neraca) */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <h4
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      marginBottom: 10,
                      borderBottom: '2px solid #e2e8f0',
                      paddingBottom: 6,
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
                        style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10}}
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
                          disabled={!canFinance || item.isTotal}
                          value={r[item.key] ?? ''}
                          onChange={e =>
                            updateField(
                              currentIndex,
                              item.key,
                              e.target.value === '' ? '' : parseFloat(e.target.value) || 0,
                            )
                          }
                          onFocus={() => handleTriggerFieldSync(item.key, `fin-${currentIndex}`)}
                          style={{
                            width: 130,
                            padding: '4px 8px',
                            fontSize: '0.8rem',
                            fontWeight: item.isTotal ? 700 : 400,
                            background: item.isTotal ? '#f8fafc' : '#ffffff',
                            textAlign: 'right',
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Income Statement (Laba Rugi) */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <h4
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      marginBottom: 10,
                      borderBottom: '2px solid #e2e8f0',
                      paddingBottom: 6,
                    }}
                  >
                    Income Statement (Laba Rugi)
                  </h4>
                  <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                    {[
                      {key: 'revenue', label: 'Revenue (Pendapatan)'},
                      {key: 'grossMargin', label: 'Gross Profit (Laba Kotor)'},
                      {key: 'operatingMargin', label: 'Operating Profit (Laba Operasi)'},
                      {key: 'tax', label: 'Tax (Pajak)'},
                      {key: 'netIncome', label: 'Net Income (Laba Bersih)', isTotal: true},
                    ].map(item => (
                      <div
                        key={item.key}
                        style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10}}
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
                          disabled={!canFinance}
                          value={r[item.key] ?? ''}
                          onChange={e =>
                            updateField(
                              currentIndex,
                              item.key,
                              e.target.value === '' ? '' : parseFloat(e.target.value) || 0,
                            )
                          }
                          onFocus={() => handleTriggerFieldSync(item.key, `fin-${currentIndex}`)}
                          style={{
                            width: 130,
                            padding: '4px 8px',
                            fontSize: '0.8rem',
                            fontWeight: item.isTotal ? 700 : 400,
                            background: item.isTotal ? '#f0fdf4' : '#ffffff',
                            textAlign: 'right',
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

