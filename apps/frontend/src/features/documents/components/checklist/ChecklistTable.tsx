/** The checklist table with its rows and the empty state. */
import {AlertCircle, ChevronDown, ChevronRight} from 'lucide-react';
import {ChecklistRowItem} from '@/features/documents/components/checklist/ChecklistRowItem';
import {StageBadge} from '@/features/documents/components/checklist/StageBadge';
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
    />
  );
  let counter = 0;

  return (
    <div className="table-scroll doc-table-wrapper">
      <table className="data-table doc-checklist-table">
        <thead>
          <tr>
            <th className="col-no" style={{width: '40px', minWidth: '40px', textAlign: 'center'}}>NO</th>
            <th className="col-doc" style={{width: '26%', minWidth: '200px'}}>REQUIRED DOCUMENT</th>
            <th className="col-status" style={{width: '22%', minWidth: '180px'}}>STATUS & APPROVAL</th>
            <th className="col-source" style={{width: '36%', minWidth: '220px'}}>FILE & SOURCE</th>
            <th className="col-actions" style={{width: '160px', minWidth: '160px', textAlign: 'center'}}>ACTIONS</th>
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
                        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        <StageBadge code={g.code} name={g.name} />
                        <span className="doc-group-meta">
                          {g.rows.length} documents · {g.availableCount} fulfilled
                        </span>
                      </button>
                    </td>
                  </tr>,
                  ...(open ? g.rows.map((row, i) => renderRow(row, start + i)) : []),
                ];
              })
            : rows.map((row, idx) => renderRow(row, idx))}

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
    </div>
  );
}
