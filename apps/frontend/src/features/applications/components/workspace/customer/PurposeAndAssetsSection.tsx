/** Customer section 05: Financing Purpose & List of Fixed Assets. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {ChevronDown, Eye} from 'lucide-react';

export function PurposeAndAssetsSection() {
  const {
    draft,
    setDraft,
    openSections,
    setOpenSections,
    handleTriggerFieldSync,
    handleTriggerSync,
    toggleSection,
    canEdit,
  } = useWorkspace();

  const rawPurpose = draft.financingPurposeDetail;
  const purposeList = Array.isArray(rawPurpose)
    ? rawPurpose.map((s: any) => String(s).toUpperCase())
    : String(rawPurpose || '')
        .split(',')
        .map((s: string) => s.trim().toUpperCase())
        .filter(Boolean);

  const togglePurpose = (val: string) => {
    if (!canEdit) return;
    let next: string[];
    if (purposeList.includes(val)) {
      next = purposeList.filter((x: string) => x !== val);
    } else {
      next = [...purposeList, val];
    }
    setDraft({...draft, financingPurposeDetail: next.join(',')});
  };

  const lgHe = Number(draft.assetSummaryHeLiuGong) || 0;
  const lgTruck = Number(draft.assetSummaryTruckLiuGong) || 0;
  const nlgHe = Number(draft.assetSummaryHeNonLiuGong) || 0;
  const nlgTruck = Number(draft.assetSummaryTruckNonLiuGong) || 0;

  const lgUnit = lgHe + lgTruck;
  const nlgUnit = nlgHe + nlgTruck;
  const totHe = lgHe + nlgHe;
  const totTruck = lgTruck + nlgTruck;
  const totUnit = lgUnit + nlgUnit;

  const lgPct = totUnit > 0 ? ((lgUnit / totUnit) * 100).toFixed(1) + '%' : '0.0%';
  const nlgPct = totUnit > 0 ? ((nlgUnit / totUnit) * 100).toFixed(1) + '%' : '0.0%';
  const totPct = totUnit > 0 ? '100.0%' : '0.0%';

  return (
    <div
      className={`fap-accordion-card ${openSections['fap-preview-sec-purpose-assets'] ? 'is-open' : 'is-closed'}`}
      id="acc-fap-preview-sec-purpose-assets"
      data-section="purpose-assets"
    >
      <div className="fap-accordion-header" onClick={() => toggleSection('fap-preview-sec-purpose-assets')}>
        <div className="fap-acc-header-left">
          <span className="fap-acc-step-badge">05</span>
          <div className="fap-acc-titles">
            <div className="fap-acc-title-row">
              <h4 className="fap-acc-title">Financing Purpose & List of Fixed Assets</h4>
              <span className={`fap-acc-badge ${totUnit > 0 ? 'success' : ''}`}>
                {totUnit} Total Units
              </span>
            </div>
            <p className="fap-acc-subtitle">
              Tujuan pembiayaan dan ringkasan kepemilikan aset tetap (LiuGong vs Non-LiuGong)
            </p>
          </div>
        </div>
        <div className="fap-acc-header-right">
          <button
            type="button"
            className="fap-acc-sync-btn"
            title="Sync preview document to this section"
            onClick={e => {
              e.stopPropagation();
              handleTriggerSync('fap-preview-sec-purpose-assets');
              setOpenSections(s => ({...s, ['fap-preview-sec-purpose-assets']: true}));
            }}
          >
            <Eye size={12} /> Sync View
          </button>
          <span className={`fap-acc-chevron ${openSections['fap-preview-sec-purpose-assets'] ? 'rotate' : ''}`}>
            <ChevronDown size={17} />
          </span>
        </div>
      </div>
      {openSections['fap-preview-sec-purpose-assets'] && (
        <div className="fap-accordion-content">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '16px',
              alignItems: 'start',
            }}
          >
            {/* Left: Tujuan Pembiayaan / Financing Purpose */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '14px 16px',
              }}
            >
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{color: '#2563eb'}}>●</span> Tujuan Pembiayaan / Financing Purpose
              </div>

              {/* Investasi */}
              <div style={{marginBottom: 12}}>
                <div
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#1e40af',
                    marginBottom: 6,
                    borderBottom: '1px solid #e2e8f0',
                    paddingBottom: 4,
                  }}
                >
                  Investasi / Investment (✓) :
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
                  {[
                    {key: 'BUSINESS_ACTIVITY', label: 'Aktivitas Usaha / Investasi (Business Activity/Investment)'},
                    {key: 'REHABILITATION', label: 'Rehabilitasi (rehabilitation)'},
                    {key: 'EXPANSION', label: 'Modernisasi/Ekspansi (modernization/expansion)'},
                    {key: 'RELOCATION', label: 'Relokasi tempat usaha (relocation of business premises)'},
                  ].map(item => {
                    const checked = purposeList.includes(item.key);
                    return (
                      <label
                        key={item.key}
                        onClick={() => togglePurpose(item.key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: '0.78rem',
                          color: checked ? '#0f172a' : '#475569',
                          fontWeight: checked ? 600 : 400,
                          background: checked ? '#eff6ff' : '#ffffff',
                          border: `1px solid ${checked ? '#93c5fd' : '#e2e8f0'}`,
                          padding: '6px 10px',
                          borderRadius: 6,
                          cursor: canEdit ? 'pointer' : 'default',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!canEdit}
                          onChange={() => {}}
                          style={{cursor: canEdit ? 'pointer' : 'default', accentColor: '#2563eb'}}
                        />
                        <span>{item.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Modal Kerja */}
              <div>
                <div
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#059669',
                    marginBottom: 6,
                    borderBottom: '1px solid #e2e8f0',
                    paddingBottom: 4,
                  }}
                >
                  Modal Kerja / Working Capital (✓) :
                </div>
                <label
                  onClick={() => togglePurpose('WORKING_CAPITAL')}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    fontSize: '0.78rem',
                    color: purposeList.includes('WORKING_CAPITAL') ? '#0f172a' : '#475569',
                    fontWeight: purposeList.includes('WORKING_CAPITAL') ? 600 : 400,
                    background: purposeList.includes('WORKING_CAPITAL') ? '#ecfdf5' : '#ffffff',
                    border: `1px solid ${purposeList.includes('WORKING_CAPITAL') ? '#6ee7b7' : '#e2e8f0'}`,
                    padding: '8px 10px',
                    borderRadius: 6,
                    cursor: canEdit ? 'pointer' : 'default',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={purposeList.includes('WORKING_CAPITAL')}
                    disabled={!canEdit}
                    onChange={() => {}}
                    style={{marginTop: 2, cursor: canEdit ? 'pointer' : 'default', accentColor: '#059669'}}
                  />
                  <span style={{lineHeight: 1.35}}>
                    memenuhi kebutuhan pengeluaran yang habis dalam 1 (satu) siklus usaha / fulfilling the expenditure needs that are used up in 1 (one) business cycle
                  </span>
                </label>
              </div>
            </div>

            {/* Right: List Fixed Assets Table */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '14px 16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{color: '#0284c7'}}>●</span> List Fixed Assets
              </div>
              <div style={{fontSize: '0.74rem', color: '#64748b', fontStyle: 'italic', marginBottom: 12}}>
                *daftar unit terlampir / list equipment attached
              </div>

              <div style={{overflowX: 'auto'}}>
                <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.8rem'}}>
                  <thead>
                    <tr style={{background: '#f1f5f9', borderBottom: '1.5pt solid #cbd5e1'}}>
                      <th style={{padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#334155'}}>
                        Brand
                      </th>
                      <th style={{padding: '8px 10px', fontWeight: 700, color: '#334155', width: 75}}>HE</th>
                      <th style={{padding: '8px 10px', fontWeight: 700, color: '#334155', width: 75}}>Truck</th>
                      <th style={{padding: '8px 10px', fontWeight: 700, color: '#334155', width: 75, background: '#e2e8f0'}}>
                        Unit
                      </th>
                      <th style={{padding: '8px 10px', fontWeight: 700, color: '#334155', width: 95, background: '#e2e8f0'}}>
                        Percentage
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* LiuGong */}
                    <tr style={{borderBottom: '1px solid #e2e8f0'}}>
                      <td style={{padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#1d4ed8'}}>
                        LiuGong
                      </td>
                      <td style={{padding: '4px'}}>
                        <input
                          type="number"
                          min="0"
                          className="input-field"
                          style={{width: '100%', textAlign: 'center', padding: '4px 2px', fontSize: '0.8rem'}}
                          disabled={!canEdit}
                          value={draft.assetSummaryHeLiuGong ?? 0}
                          onChange={e =>
                            setDraft({...draft, assetSummaryHeLiuGong: parseInt(e.target.value, 10) || 0})
                          }
                          onFocus={() => handleTriggerFieldSync('assetSummaryHeLiuGong', 'purpose-assets')}
                        />
                      </td>
                      <td style={{padding: '4px'}}>
                        <input
                          type="number"
                          min="0"
                          className="input-field"
                          style={{width: '100%', textAlign: 'center', padding: '4px 2px', fontSize: '0.8rem'}}
                          disabled={!canEdit}
                          value={draft.assetSummaryTruckLiuGong ?? 0}
                          onChange={e =>
                            setDraft({...draft, assetSummaryTruckLiuGong: parseInt(e.target.value, 10) || 0})
                          }
                          onFocus={() => handleTriggerFieldSync('assetSummaryTruckLiuGong', 'purpose-assets')}
                        />
                      </td>
                      <td style={{padding: '8px 10px', fontWeight: 700, background: '#f8fafc', color: '#0f172a'}}>
                        {lgUnit}
                      </td>
                      <td style={{padding: '8px 10px', fontWeight: 700, background: '#f8fafc', color: '#2563eb'}}>
                        {lgPct}
                      </td>
                    </tr>

                    {/* Non LiuGong */}
                    <tr style={{borderBottom: '1px solid #e2e8f0'}}>
                      <td style={{padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#475569'}}>
                        Non LiuGong
                      </td>
                      <td style={{padding: '4px'}}>
                        <input
                          type="number"
                          min="0"
                          className="input-field"
                          style={{width: '100%', textAlign: 'center', padding: '4px 2px', fontSize: '0.8rem'}}
                          disabled={!canEdit}
                          value={draft.assetSummaryHeNonLiuGong ?? 0}
                          onChange={e =>
                            setDraft({...draft, assetSummaryHeNonLiuGong: parseInt(e.target.value, 10) || 0})
                          }
                          onFocus={() => handleTriggerFieldSync('assetSummaryHeNonLiuGong', 'purpose-assets')}
                        />
                      </td>
                      <td style={{padding: '4px'}}>
                        <input
                          type="number"
                          min="0"
                          className="input-field"
                          style={{width: '100%', textAlign: 'center', padding: '4px 2px', fontSize: '0.8rem'}}
                          disabled={!canEdit}
                          value={draft.assetSummaryTruckNonLiuGong ?? 0}
                          onChange={e =>
                            setDraft({...draft, assetSummaryTruckNonLiuGong: parseInt(e.target.value, 10) || 0})
                          }
                          onFocus={() => handleTriggerFieldSync('assetSummaryTruckNonLiuGong', 'purpose-assets')}
                        />
                      </td>
                      <td style={{padding: '8px 10px', fontWeight: 700, background: '#f8fafc', color: '#0f172a'}}>
                        {nlgUnit}
                      </td>
                      <td style={{padding: '8px 10px', fontWeight: 700, background: '#f8fafc', color: '#64748b'}}>
                        {nlgPct}
                      </td>
                    </tr>

                    {/* Total Row */}
                    <tr style={{background: '#f1f5f9', fontWeight: 800, borderTop: '1.5pt solid #cbd5e1'}}>
                      <td style={{padding: '8px 10px', textAlign: 'left', color: '#0f172a'}}>Total</td>
                      <td style={{padding: '8px 10px', color: '#0f172a'}}>{totHe}</td>
                      <td style={{padding: '8px 10px', color: '#0f172a'}}>{totTruck}</td>
                      <td style={{padding: '8px 10px', color: '#0f172a'}}>{totUnit}</td>
                      <td style={{padding: '8px 10px', color: '#0f172a'}}>{totPct}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

