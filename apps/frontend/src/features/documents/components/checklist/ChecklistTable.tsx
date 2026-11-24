/** The checklist table with its rows, stage headers, approval audit modal, confirmation bubble and pagination. */
import {AlertCircle, ChevronDown, ChevronLeft, ChevronRight} from 'lucide-react';
import {useState} from 'react';
import {ChecklistRowItem} from '@/features/documents/components/checklist/ChecklistRowItem';
import {DocumentApprovalModal} from '@/features/documents/components/checklist/DocumentApprovalModal';
import {SubmitApprovalConfirmModal} from '@/features/documents/components/checklist/SubmitApprovalConfirmModal';
import {groupRowsByStage} from '@/features/documents/lib/checklist/group-rows';
import type {ChecklistRow} from '@/features/documents/lib/checklist/types';

export function ChecklistTable({
  rows,
  uploadingCode,
  deletingFileId,
  onPreview,
  onUpload,
  onDelete,
  onRequestApproval,
  approvalBusy,
  grouped,
  collapsedStages,
  onToggleStage,
}: {
  rows: ChecklistRow[];
  grouped: boolean;
  collapsedStages: Set<string>;
  onToggleStage: (code: string) => void;
  uploadingCode: string | null;
  deletingFileId: string | null;
  onPreview: (row: ChecklistRow, file?: any) => void;
  onUpload: (code: string, chkId?: string) => void;
  onDelete: (fileId: string, code: string) => void;
  onRequestApproval?: (row: ChecklistRow) => void;
  approvalBusy?: string | null;
}) {
  const columns = 5;
  const groups = grouped ? groupRowsByStage(rows) : [];
  const [selectedApprovalRow, setSelectedApprovalRow] = useState<ChecklistRow | null>(null);
  const [confirmingSubmitRow, setConfirmingSubmitRow] = useState<ChecklistRow | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'ALL'>(10);

  const totalItems = rows.length;
  const effectivePageSize = pageSize === 'ALL' ? totalItems : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));
  const page = Math.min(currentPage, totalPages);
  const startIndex = (page - 1) * effectivePageSize;
  const displayedRows = pageSize === 'ALL' ? rows : rows.slice(startIndex, startIndex + effectivePageSize);

  const handleConfirmSubmit = async (row: ChecklistRow) => {
    if (onRequestApproval) {
      await onRequestApproval(row);
    }
    setConfirmingSubmitRow(null);
  };

  const renderRow = (row: ChecklistRow, idx: number) => (
    <ChecklistRowItem
      key={row.chkId || `${row.stage}_${row.code}_${idx}`}
      row={row}
      index={idx}
      showStage={!grouped}
      isUploading={uploadingCode === (row.chkId || row.code)}
      deletingFileId={deletingFileId}
      onPreview={onPreview}
      onUpload={onUpload}
      onDelete={onDelete}
      onRequestApproval={onRequestApproval}
      approvalBusy={approvalBusy}
      onOpenApprovalModal={setSelectedApprovalRow}
      onConfirmSubmit={setConfirmingSubmitRow}
    />
  );
  let counter = 0;

  return (
    <>
      <div className="table-scroll doc-table-wrapper">
        <table className="data-table doc-checklist-table doc-table">
          <thead>
            <tr>
              <th className="col-no" style={{width: '40px', minWidth: '40px', textAlign: 'center'}}>
                NO
              </th>
              <th className="col-doc" style={{width: '26%', minWidth: '200px'}}>
                REQUIRED DOCUMENT
              </th>
              <th className="col-status" style={{width: '24%', minWidth: '200px'}}>
                STATUS &amp; APPROVAL
              </th>
              <th className="col-source" style={{width: '34%', minWidth: '220px'}}>
                FILE &amp; SOURCE
              </th>
              <th className="col-actions" style={{width: '160px', minWidth: '160px', textAlign: 'center'}}>
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {grouped
              ? groups.map(g => {
                  const open = !collapsedStages.has(g.code);
                  const start = counter;
                  counter += g.rows.length;
                  return [
                    <tr key={`g-${g.code}`} className="doc-group-row">
                      <td colSpan={columns}>
                        <button
                          type="button"
                          className="doc-group-toggle"
                          aria-expanded={open}
                          onClick={() => onToggleStage(g.code)}
                        >
                          <span style={{display: 'inline-flex', alignItems: 'center', gap: '6px'}}>
                            {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                            <span style={{fontSize: '11px'}}>🔵</span>
                            <strong>{g.name || g.code}</strong>
                            <span style={{color: '#94a3b8', margin: '0 2px'}}>·</span>
                            <span className="doc-group-meta">
                              {g.rows.length} documents · {g.availableCount} fulfilled
                            </span>
                          </span>
                        </button>
                      </td>
                    </tr>,
                    ...(open ? g.rows.map((row, i) => renderRow(row, start + i)) : []),
                  ];
                })
              : displayedRows.map((row, idx) => renderRow(row, startIndex + idx))}

            {!rows.length && (
              <tr>
                <td colSpan={columns} style={{textAlign: 'center', padding: '40px 20px'}}>
                  <AlertCircle size={28} style={{color: '#94a3b8', margin: '0 auto 8px'}} />
                  <p style={{fontWeight: 600, color: '#475569'}}>
                    No documents match the current filter or search criteria
                  </p>
                  <small className="muted">Try changing your search keywords or resetting the filters.</small>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination & Summary Bar */}
        <div
          className="doc-pagination-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            fontSize: '12px',
            color: '#64748b',
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
            <span>
              {grouped ? (
                <>
                  Showing all <strong>{totalItems}</strong> documents in <strong>{groups.length}</strong> stages
                </>
              ) : (
                <>
                  Showing <strong>{totalItems === 0 ? 0 : startIndex + 1}</strong> to{' '}
                  <strong>{Math.min(startIndex + effectivePageSize, totalItems)}</strong> of{' '}
                  <strong>{totalItems}</strong> documents
                </>
              )}
            </span>
            {!grouped && (
              <div style={{display: 'inline-flex', alignItems: 'center', gap: 6}}>
                <span style={{color: '#94a3b8'}}>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    border: '1px solid #cbd5e1',
                    fontSize: '11.5px',
                    background: '#fff',
                    color: '#334155',
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value="ALL">All</option>
                </select>
              </div>
            )}
          </div>

          {!grouped && totalPages > 1 && (
            <div style={{display: 'flex', alignItems: 'center', gap: 4}}>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="button small"
                style={{padding: '4px 8px', opacity: page <= 1 ? 0.5 : 1}}
              >
                <ChevronLeft size={13} />
              </button>
              {Array.from({length: totalPages}, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  className={`button small ${p === page ? 'primary' : ''}`}
                  style={{padding: '3px 9px', minWidth: 28, fontSize: '11.5px'}}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="button small"
                style={{padding: '4px 8px', opacity: page >= totalPages ? 0.5 : 1}}
              >
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Approval Audit Stepper Modal */}
      <DocumentApprovalModal
        row={selectedApprovalRow}
        isOpen={!!selectedApprovalRow}
        onClose={() => setSelectedApprovalRow(null)}
        onConfirmSubmit={setConfirmingSubmitRow}
        approvalBusy={approvalBusy}
      />

      {/* "Yes or No" Simple Confirmation Bubble Modal */}
      <SubmitApprovalConfirmModal
        row={confirmingSubmitRow}
        isOpen={!!confirmingSubmitRow}
        onClose={() => setConfirmingSubmitRow(null)}
        onConfirm={handleConfirmSubmit}
        busy={approvalBusy === confirmingSubmitRow?.chkId}
      />
    </>
  );
}
