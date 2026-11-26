/** Screens 2 & 3 of Redesign 2: Data comparison table with row hover "View on document" action. */
import {AlertTriangle, CheckCircle2, Columns2, HelpCircle, Loader2, RefreshCw} from 'lucide-react';
import {FapDiffActions} from '@/features/documents/components/studio/fap/FapDiffActions';
import {FapVerificationRemarks} from '@/features/documents/components/studio/fap/FapVerificationRemarks';
import {RerunOcrNotice} from '@/features/fap/components/RerunOcrNotice';
import {
  FAP_SECTIONS,
  type ComparisonRow,
} from '@/features/documents/lib/fap-comparison-rows';
import {useDocumentsStudioContext} from '@/features/documents/components/studio/DocumentsContext';

export function FapComparisonTableView({
  rows,
  statusFilter,
  setStatusFilter,
  sectionFilter,
  setSectionFilter,
  onSelectRow,
  viewMode,
  setViewMode,
}: {
  rows: ComparisonRow[];
  statusFilter: 'all' | 'diff' | 'match';
  setStatusFilter: (v: 'all' | 'diff' | 'match') => void;
  sectionFilter: string;
  setSectionFilter: (v: string) => void;
  onSelectRow: (row: ComparisonRow) => void;
  viewMode: 'comparison' | 'side-by-side';
  setViewMode: (v: 'comparison' | 'side-by-side') => void;
}) {
  const {busy, activeFile, fapComparison, isFapOcrScanning, handleRunFapComparison} = useDocumentsStudioContext();

  const diffRows = rows.filter(r => r.status !== 'match');
  const matchRows = rows.filter(r => r.status === 'match');

  const visibleRows = rows.filter(r => {
    if (statusFilter === 'diff' && r.status === 'match') return false;
    if (statusFilter === 'match' && r.status !== 'match') return false;
    if (sectionFilter !== 'all' && r.sectionId !== sectionFilter) return false;
    return true;
  });

  const notedOnly = !fapComparison?.hasDifferences && (fapComparison?.notedDiffs?.length || 0) > 0;
  const totalDiffCount = diffRows.length;

  return (
    <div className="fap-r2-section">
      {/* Toolbar: Data comparison | Side by side   ---   All | Differences | Match   Section: All */}
      <div className="fap-r2-toolbar">
        <div className="fap-r2-seg" role="tablist" aria-label="Document view mode">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'comparison'}
            className={viewMode === 'comparison' ? 'on' : ''}
            onClick={() => setViewMode('comparison')}
          >
            Data comparison
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'side-by-side'}
            className={viewMode === 'side-by-side' ? 'on' : ''}
            onClick={() => setViewMode('side-by-side')}
          >
            Side by side
          </button>
        </div>

        <div className="fap-r2-toolbar-right">
          <div className="fap-r2-seg" role="tablist" aria-label="Filter comparison rows">
            <button
              type="button"
              className={statusFilter === 'all' ? 'on' : ''}
              onClick={() => setStatusFilter('all')}
            >
              All {rows.length}
            </button>
            <button
              type="button"
              className={statusFilter === 'diff' ? 'on' : ''}
              onClick={() => setStatusFilter('diff')}
            >
              Differences {totalDiffCount}
            </button>
            <button
              type="button"
              className={statusFilter === 'match' ? 'on' : ''}
              onClick={() => setStatusFilter('match')}
            >
              Match {matchRows.length}
            </button>
          </div>

          <div className="fap-r2-section-select">
            <span>Section:</span>
            <select
              aria-label="Filter by section"
              value={sectionFilter}
              onChange={e => setSectionFilter(e.target.value)}
            >
              <option value="all">All</option>
              {FAP_SECTIONS.map(sec => (
                <option key={sec.id} value={sec.id}>
                  {sec.shortLabel}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Scanning banner */}
      {isFapOcrScanning && (
        <div className="fap-r2-banner info">
          <div className="fap-r2-banner-left">
            <Loader2 size={16} className="spin" />
            <span>
              <strong>Reading signed FAP form with OCR…</strong> Comparison results will appear here automatically.
            </span>
          </div>
        </div>
      )}

      {/* Earlier file without comparison */}
      {!isFapOcrScanning && !fapComparison && activeFile && activeFile.isCurrent === false && (
        <div className="fap-r2-banner warn">
          <div className="fap-r2-banner-left">
            <AlertTriangle size={16} />
            <span>
              <strong>Earlier file:</strong> {activeFile.fileName} has no OCR comparison yet.
            </span>
          </div>
          <button
            type="button"
            className="fap-r2-btn-outline"
            disabled={busy}
            onClick={handleRunFapComparison}
          >
            <RefreshCw size={13} /> Scan this file
          </button>
        </div>
      )}

      {fapComparison?.needsRerun && <RerunOcrNotice />}

      {fapComparison?.isCurrent === false && (
        <div className="fap-r2-banner warn">
          <div className="fap-r2-banner-left">
            <AlertTriangle size={16} />
            <span>
              <strong>Earlier file:</strong> This comparison is kept as history and cannot be approved or edited.
            </span>
          </div>
        </div>
      )}

      {/* Main summary notice banner (matches SVG amber banner) */}
      {!isFapOcrScanning && fapComparison && (
        totalDiffCount > 0 ? (
          <div className="fap-r2-banner warn">
            <div className="fap-r2-banner-left">
              <HelpCircle size={16} />
              <span>
                <strong>{totalDiffCount} differences</strong>{' '}
                {notedOnly
                  ? `between system data and the signed form were noted${fapComparison.reviewedBy ? ` by ${fapComparison.reviewedBy}` : ''}. System data was not changed.`
                  : 'between system data and the signed form were detected. Review or note differences below.'}
              </span>
            </div>
            <span className="fap-r2-banner-hint">Click a row to see it on both documents</span>
          </div>
        ) : (
          <div className="fap-r2-banner success">
            <div className="fap-r2-banner-left">
              <CheckCircle2 size={16} />
              <span>
                <strong>All fields match</strong> between system data and the signed FAP form.
              </span>
            </div>
            <span className="fap-r2-banner-hint">Click a row to see it on both documents</span>
          </div>
        )
      )}

      {/* 5-column comparison table */}
      {fapComparison && (
        <div className="fap-r2-table-card">
          <div className="fap-r2-table-scroll">
            <table className="fap-r2-table">
              <thead>
                <tr>
                  <th style={{width: '21%'}}>FIELD</th>
                  <th style={{width: '26%'}}>SYSTEM DATA</th>
                  <th style={{width: '26%'}}>SIGNED FORM (OCR)</th>
                  <th style={{width: '12%'}}>SECTION</th>
                  <th style={{width: '15%', textAlign: 'right'}}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(row => {
                  const sysDisplay = row.systemValue;
                  const ocrDisplay = row.ocrValue;
                  return (
                    <tr
                      key={row.field}
                      className="fap-r2-row"
                      onClick={() => onSelectRow(row)}
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectRow(row);
                        }
                      }}
                    >
                      <td>
                        <div className="fap-r2-field-label">{row.label}</div>
                        <div className="fap-r2-field-key">{row.field}</div>
                      </td>
                      <td title={row.systemValue || undefined}>
                        {sysDisplay ? (
                          <span className="fap-r2-sys-val">{sysDisplay}</span>
                        ) : (
                          <span className="fap-r2-empty-val">Empty</span>
                        )}
                      </td>
                      <td title={row.ocrValue || undefined}>
                        {row.status === 'match' ? (
                          ocrDisplay ? (
                            <span className="fap-r2-sys-val">{ocrDisplay}</span>
                          ) : (
                            <span className="fap-r2-empty-val">Empty</span>
                          )
                        ) : ocrDisplay ? (
                          <span className="fap-r2-ocr-chip diff">{ocrDisplay}</span>
                        ) : (
                          <span className="fap-r2-ocr-chip missing">Not on document</span>
                        )}
                      </td>
                      <td>
                        <span className="fap-r2-sec-text">{row.sectionLabel}</span>
                      </td>
                      <td style={{textAlign: 'right'}}>
                        <span className="fap-r2-status-cell">
                          <span className={`fap-r2-status-pill ${row.status}`}>
                            {row.status === 'noted' ? 'Noted' : row.status === 'match' ? 'Match' : 'Different'}
                          </span>
                          <span className="fap-r2-view-btn">
                            <Columns2 size={13} /> View on document
                          </span>
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="fap-r2-table-empty">
                      No fields match the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Remarks & approval actions (kept cleanly below the table so existing review workflow works unchanged) */}
      {fapComparison && (
        <div className="fap-r2-review-footer">
          <FapVerificationRemarks />
          <FapDiffActions />
        </div>
      )}
    </div>
  );
}
