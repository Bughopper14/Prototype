/** FAP view: differences between the system FAP and the uploaded FAP, with approve / apply. */
import {AlertTriangle, CheckCircle, Loader2, RefreshCw, Sparkles} from 'lucide-react';

import {useDocumentsStudioContext} from '@/features/documents/components/studio/DocumentsContext';

import {FapDiffActions} from '@/features/documents/components/studio/fap/FapDiffActions';
import {FapVerificationRemarks} from '@/features/documents/components/studio/fap/FapVerificationRemarks';
export function FapDiffPanel() {
  const {
    busy,
    fapComparison,
    fapNavFilter,
    setFapNavFilter,
    fapSectionTitles,
    filteredDiffs,
    activeFiles,
    handleRunFapComparison,
  } = useDocumentsStudioContext();
  return (
    <>
      {activeFiles.length > 0 && fapComparison && (
        <div className="fap-diff-panel">
          <div className="fap-diff-panel-head">
            <div>
              <h3>
                <Sparkles size={18} color="#2563eb" />
                Data Difference Analysis (System vs Physical Document OCR)
              </h3>
              <p>
                Automatic comparison results between system database values and data read from the physically
                signed FAP document.
              </p>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <button
                type="button"
                className="button small"
                disabled={busy}
                onClick={handleRunFapComparison}
                style={{display: 'inline-flex', alignItems: 'center', gap: '6px'}}
                title="Re-scan the physical document and compare with the latest system data"
              >
                {busy ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />}
                Re-analyze OCR
              </button>
            </div>
          </div>

          {/* Notice Alert Banner */}
          {fapComparison.hasDifferences ? (
            <div className="fap-diff-banner warning">
              <AlertTriangle size={18} style={{flexShrink: 0, marginTop: 1}} />
              <div>
                <strong>Non-Blocking Notice:</strong>{' '}
                <strong>{fapComparison.diffs?.length || 0} data differences</strong> detected between the
                signed physical document and the system database. The submit button is now unlocked. You may
                approve the data changes to update the system automatically, or keep the existing system data.
              </div>
            </div>
          ) : (
            <div className="fap-diff-banner success">
              <CheckCircle size={18} style={{flexShrink: 0, marginTop: 1}} />
              <div>
                <strong>Perfect Verification:</strong> All data on the physical document read by OCR matches
                100% with the system database. No inconsistencies found.
              </div>
            </div>
          )}

          {/* Differences Table */}
          {fapComparison.diffs && (
            <>
              {fapNavFilter !== 'all' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 14px',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '6px',
                    marginBottom: '12px',
                    fontSize: '12px',
                    color: '#1e40af',
                  }}
                >
                  <span>
                    Showing differences for: <strong>{fapSectionTitles[fapNavFilter] || fapNavFilter}</strong>{' '}
                    ({filteredDiffs.length} differences)
                  </span>
                  <button
                    type="button"
                    className="button small"
                    onClick={() => setFapNavFilter('all')}
                    style={{fontSize: '11px', padding: '2px 10px', height: '24px', background: '#ffffff'}}
                  >
                    Show All Differences ({fapComparison.diffs.length})
                  </button>
                </div>
              )}
              <div className="fap-diff-table-wrap">
                <table className="fap-diff-table">
                  <thead>
                    <tr>
                      <th style={{width: '24%'}}>Field Name</th>
                      <th style={{width: '30%'}}>Current System Data</th>
                      <th style={{width: '30%'}}>OCR Detected Data (Physical Document)</th>
                      <th style={{width: '16%', textAlign: 'center'}}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDiffs.map((d: any, idx: number) => (
                      <tr key={d.field || idx} className="is-different">
                        <td>
                          <strong>{d.label}</strong>
                          <div style={{fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace'}}>
                            {d.field}
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              background: '#f1f5f9',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              border: '1px solid #e2e8f0',
                              display: 'inline-block',
                            }}
                          >
                            {d.oldValue || '—'}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              background: '#fef3c7',
                              color: '#92400e',
                              fontWeight: 600,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              border: '1px solid #fde68a',
                              display: 'inline-block',
                            }}
                          >
                            {d.newValue}
                          </span>
                        </td>
                        <td style={{textAlign: 'center'}}>
                          <span className="fap-diff-badge different">
                            <AlertTriangle size={11} /> Different
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredDiffs.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{textAlign: 'center', padding: '24px', color: '#059669'}}>
                          <CheckCircle size={20} style={{verticalAlign: 'middle', marginRight: '8px'}} />
                          {fapNavFilter === 'all'
                            ? 'All tested data fields match the system data!'
                            : `No differences found in ${fapSectionTitles[fapNavFilter] || 'this section'}.`}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* FAP Verification Remarks Rich Text Editor */}
              <FapVerificationRemarks />

              {/* Bottom Actions Bar */}
              <FapDiffActions />
            </>
          )}
        </div>
      )}
    </>
  );
}
