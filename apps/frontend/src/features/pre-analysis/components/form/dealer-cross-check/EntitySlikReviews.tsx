/** SLIK review per group entity, with YES / NO toggle and lender exposure table. */
import {usePreAnalysis} from '@/features/pre-analysis/components/PreAnalysisContext';
import {PreAnalysisRichEditor} from '@/features/pre-analysis/components/PreAnalysisRichEditor';
import {stripHtmlTags} from '@/features/pre-analysis/lib/text';
import {Trash2} from 'lucide-react';

export function EntitySlikReviews() {
  const {data, groupSubsidiaries, getEntityReview, updateEntityReview, getGrandTotal} = usePreAnalysis();
  return (
    <div style={{marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '10px'}}>
      <div style={{fontSize: '0.8rem', fontWeight: 700, color: '#0f294a', marginBottom: '8px'}}>
        GROUP ENTITY LIST FOR SLIK / BUREAU REVIEW:
      </div>

      {groupSubsidiaries.map((sub, idx) => {
        const fullEntityName = sub.subtitle
          ? `${sub.name} ${sub.subtitle}`
          : sub.name || `Entity #${idx + 1}`;
        const review = getEntityReview(idx, fullEntityName);
        const totalPlafonFormatted = getGrandTotal(review.lenderExposures);

        return (
          <div
            key={idx}
            style={{
              marginTop: idx > 0 ? '14px' : '6px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '14px',
              background: review.hasRecord ? '#ffffff' : '#f8fafc',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            {/* Header with Title and Toggle YES/NO */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '10px',
                paddingBottom: '8px',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
                <span style={{fontSize: '0.85rem', fontWeight: 700, color: '#1e3a8a'}}>
                  {idx + 1}. {fullEntityName.toUpperCase()}
                  {!review.hasRecord ? ' - No Records' : ' :'}
                </span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    background: '#dcfce7',
                    color: '#15803d',
                    padding: '1px 6px',
                    borderRadius: '3px',
                    fontWeight: 600,
                  }}
                >
                  ✓ Synced with Subsection 3
                </span>
              </div>

              {/* Toggle Yes/No Buttons */}
              <div style={{display: 'inline-flex', alignItems: 'center', gap: '8px'}}>
                <span style={{fontSize: '0.72rem', fontWeight: 600, color: '#475569'}}>
                  Use Table Row Labels?
                </span>
                <div
                  style={{
                    display: 'inline-flex',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    overflow: 'hidden',
                    background: '#e2e8f0',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => updateEntityReview(idx, {hasRecord: true})}
                    style={{
                      padding: '4px 14px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: review.hasRecord ? '#16a34a' : 'transparent',
                      color: review.hasRecord ? '#ffffff' : '#64748b',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    ✓ YES
                  </button>
                  <button
                    type="button"
                    onClick={() => updateEntityReview(idx, {hasRecord: false})}
                    style={{
                      padding: '4px 14px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: !review.hasRecord ? '#dc2626' : 'transparent',
                      color: !review.hasRecord ? '#ffffff' : '#64748b',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    ✕ NO
                  </button>
                </div>
              </div>
            </div>

            {review.hasRecord ? (
              /* YES: Show Table with dynamic Grand Total, Pefindo Analysis Notes, and Commercial Terms */
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic'}}>
                    {stripHtmlTags(data.slikPefindoHighlight)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...(review.lenderExposures || []), {lender: '', plafond: '', rate: ''}];
                      updateEntityReview(idx, {lenderExposures: next});
                    }}
                    style={{
                      fontSize: '0.72rem',
                      padding: '3px 10px',
                      borderRadius: '4px',
                      background: '#eff6ff',
                      color: '#1e40af',
                      border: '1px solid #bfdbfe',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    + Add Lender
                  </button>
                </div>

                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    marginBottom: '12px',
                  }}
                >
                  <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem'}}>
                    <thead style={{background: '#f8fafc', borderBottom: '1px solid #e2e8f0'}}>
                      <tr>
                        <th style={{padding: '6px 8px', textAlign: 'left'}}>Row Labels</th>
                        <th style={{width: '32%', padding: '6px 8px', textAlign: 'right'}}>Sum of plafon</th>
                        <th style={{width: '20%', padding: '6px 8px', textAlign: 'right'}}>Interest Rate</th>
                        <th style={{width: '36px', padding: '6px 8px'}}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(review.lenderExposures || []).map((lex, lIdx) => (
                        <tr key={lIdx} style={{borderBottom: '1px solid #f1f5f9'}}>
                          <td style={{padding: '4px 6px'}}>
                            <input
                              type="text"
                              value={lex.lender || ''}
                              onChange={e => {
                                const copy = [...review.lenderExposures];
                                copy[lIdx] = {...copy[lIdx], lender: e.target.value};
                                updateEntityReview(idx, {lenderExposures: copy});
                              }}
                              placeholder="Lender / Finco Name"
                              style={{
                                width: '100%',
                                padding: '4px',
                                fontSize: '0.75rem',
                                border: '1px solid #cbd5e1',
                                borderRadius: '3px',
                              }}
                            />
                          </td>
                          <td style={{padding: '4px 6px', textAlign: 'right'}}>
                            <input
                              type="text"
                              value={lex.plafond || ''}
                              onChange={e => {
                                const copy = [...review.lenderExposures];
                                copy[lIdx] = {...copy[lIdx], plafond: e.target.value};
                                updateEntityReview(idx, {lenderExposures: copy});
                              }}
                              placeholder="0"
                              style={{
                                width: '100%',
                                padding: '4px',
                                fontSize: '0.75rem',
                                textAlign: 'right',
                                border: '1px solid #cbd5e1',
                                borderRadius: '3px',
                                fontFamily: 'monospace',
                              }}
                            />
                          </td>
                          <td style={{padding: '4px 6px', textAlign: 'right'}}>
                            <input
                              type="text"
                              value={lex.rate || ''}
                              onChange={e => {
                                const copy = [...review.lenderExposures];
                                copy[lIdx] = {...copy[lIdx], rate: e.target.value};
                                updateEntityReview(idx, {lenderExposures: copy});
                              }}
                              placeholder="%"
                              style={{
                                width: '100%',
                                padding: '4px',
                                fontSize: '0.75rem',
                                textAlign: 'right',
                                border: '1px solid #cbd5e1',
                                borderRadius: '3px',
                              }}
                            />
                          </td>
                          <td style={{padding: '4px 6px', textAlign: 'center'}}>
                            <button
                              type="button"
                              onClick={() => {
                                const copy = review.lenderExposures.filter((_, i) => i !== lIdx);
                                updateEntityReview(idx, {lenderExposures: copy});
                              }}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#ef4444',
                                cursor: 'pointer',
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr
                        style={{
                          background: '#f8fafc',
                          fontWeight: 700,
                          borderTop: '2px solid #cbd5e1',
                        }}
                      >
                        <td style={{padding: '6px 8px', color: '#0f172a'}}>Grand Total</td>
                        <td
                          style={{
                            padding: '6px 8px',
                            textAlign: 'right',
                            color: '#1e3a8a',
                            fontFamily: 'monospace',
                            fontSize: '0.8rem',
                          }}
                        >
                          {totalPlafonFormatted}
                        </td>
                        <td style={{padding: '6px 8px', textAlign: 'right', color: '#64748b'}}>-</td>
                        <td style={{padding: '6px 8px'}}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div style={{marginBottom: '10px'}}>
                  <label
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#475569',
                      marginBottom: '4px',
                      display: 'block',
                    }}
                  >
                    Pefindo Analysis Notes
                  </label>
                  <PreAnalysisRichEditor
                    value={review.pefindoNotes || ''}
                    onChange={val => updateEntityReview(idx, {pefindoNotes: val})}
                    height={150}
                    placeholder="SLIK / Pefindo analysis notes..."
                  />
                </div>

                <div>
                  <label
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#475569',
                      marginBottom: '4px',
                      display: 'block',
                    }}
                  >
                    Commercial Terms on Other Fincos
                  </label>
                  <PreAnalysisRichEditor
                    value={review.pefindoTerms || ''}
                    onChange={val => updateEntityReview(idx, {pefindoTerms: val})}
                    height={130}
                    placeholder="Commercial terms on other fincos..."
                  />
                </div>
              </div>
            ) : (
              /* NO: Show Remarks column with TinyMCE */
              <div>
                <label
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#475569',
                    marginBottom: '4px',
                    display: 'block',
                  }}
                >
                  Remarks / Reason for No SLIK Records
                </label>
                <PreAnalysisRichEditor
                  value={review.noRecordRemarks || ''}
                  onChange={val => updateEntityReview(idx, {noRecordRemarks: val})}
                  height={140}
                  placeholder="Enter notes / reason for no existing credit records (e.g. newly established entity / no bank or finco facilities yet)..."
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
