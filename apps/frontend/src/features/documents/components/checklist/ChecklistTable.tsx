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
  onUpload: (code: string) => void;
  onDelete: (fileId: string, code: string) => void;
  onRequestApproval?: (row: ChecklistRow) => void;
  approvalBusy?: string | null;
}) {
  const columns = grouped ? 8 : 9;
  const groups = grouped ? groupRowsByStage(rows) : [];
  const renderRow = (row: ChecklistRow, idx: number) => (
    <ChecklistRowItem
      key={row.code}
      row={row}
      index={idx}
      showStage={!grouped}
      isUploading={uploadingCode === row.code}
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
            <th style={{width: '40px', textAlign: 'center'}}>NO</th>
            <th style={{minWidth: '220px'}}>DOKUMEN PERSYARATAN</th>
            {!grouped && <th style={{width: '140px'}}>TAHAP</th>}
            <th style={{width: '130px'}}>DEPARTEMEN</th>
            <th style={{width: '120px'}}>SIFAT</th>
            <th style={{width: '150px'}}>STATUS KELENGKAPAN</th>
            <th style={{minWidth: '190px'}}>APPROVAL</th>
            <th style={{minWidth: '260px'}}>SUMBER / KETERANGAN INTEGRASI</th>
            <th style={{width: '180px', textAlign: 'right'}}>AKSI</th>
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
                          {g.rows.length} dokumen · {g.availableCount} terpenuhi
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
                  Tidak ada dokumen yang sesuai filter atau pencarian
                </p>
                <small className="muted">Coba ubah kata kunci pencarian atau reset filter departemen.</small>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
