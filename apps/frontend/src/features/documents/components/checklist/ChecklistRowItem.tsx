/** One row of the checklist table. */
import {CheckCircle2, Clock, ShieldCheck, XCircle} from 'lucide-react';
import {DocumentRowActions} from '@/features/documents/components/checklist/DocumentRowActions';
import {DocumentSourceCell} from '@/features/documents/components/checklist/DocumentSourceCell';
import {StageBadge} from '@/features/documents/components/checklist/StageBadge';
import type {ChecklistRow} from '@/features/documents/lib/checklist/types';

export function ChecklistRowItem({
  row,
  index,
  isUploading,
  deletingFileId,
  onPreview,
  onUpload,
  onDelete,
  onRequestApproval,
  approvalBusy,
  showStage,
}: {
  row: ChecklistRow;
  index: number;
  /** The stage column is hidden when the table is already grouped by stage. */
  showStage: boolean;
  isUploading: boolean;
  deletingFileId: string | null;
  onPreview: (row: ChecklistRow, file?: any) => void;
  onUpload: (code: string) => void;
  onDelete: (fileId: string, code: string) => void;
  onRequestApproval?: (row: ChecklistRow) => void;
  approvalBusy?: string | null;
}) {
  return (
    <tr className={`doc-checklist-row ${row.isAvailable ? 'row-available' : 'row-pending'}`}>
      <td style={{textAlign: 'center', fontWeight: 600, color: '#64748b'}}>{index + 1}</td>
      {/* Dokumen Info */}
      <td>
        <div className="doc-meta-cell">
          <div className={`doc-code-badge badge-${(row.department || '').toLowerCase()}`}>{row.code}</div>
          <div>
            <strong className="doc-primary-name">{row.name}</strong>
            <span className="doc-sub-desc">{row.description}</span>
          </div>
        </div>
      </td>

      {/* Tahap workflow */}
      {showStage && (
        <td>
          <StageBadge code={row.stage} name={row.stageName} />
        </td>
      )}

      {/* Departemen */}
      <td>
        {row.department ? <span className={`dept-pill dept-${row.department.toLowerCase()}`}>{row.department}</span> : <span className="muted">-</span>}
      </td>

      {/* Sifat Dokumen */}
      <td>
        {row.isMandatory ? (
          <span className="mandatory-tag tag-required">Wajib</span>
        ) : (
          <span className="mandatory-tag tag-optional">Opsional</span>
        )}
      </td>

      {/* Status Kelengkapan */}
      <td>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4}}>
          {row.isAvailable ? (
            <span className="status-pill status-ready">
              <CheckCircle2 size={13} style={{marginRight: 4}} /> Sudah Ada
            </span>
          ) : (
            <span className="status-pill status-missing">
              <Clock size={13} style={{marginRight: 4}} /> Belum Ada
            </span>
          )}
          {row.status === 'VERIFIED' && (
            <span className="status-pill status-ready">
              <ShieldCheck size={13} style={{marginRight: 4}} /> Terverifikasi
            </span>
          )}
          {row.status === 'REJECTED' && (
            <span className="status-pill status-missing">
              <XCircle size={13} style={{marginRight: 4}} /> Ditolak
            </span>
          )}
        </div>
      </td>

      {/* Approval dokumen */}
      <td>
        {row.check?.approval ? (
          <div className={'doc-approval ' + String(row.check.approval.state).toLowerCase()}>
            {row.check.approval.state === 'NOT_REQUESTED' ? (
              <>
              <button
                type="button"
                className="button small doc-needs"
                style={!row.check.approval.canRequest ? {opacity: 0.55, cursor: 'not-allowed'} : undefined}
                disabled={!onRequestApproval || !row.check.approval.canRequest || approvalBusy === row.chkId}
                title={row.check.approval.canRequest ? 'Send this document for approval' : 'Upload a file for this document first'}
                onClick={() => onRequestApproval?.(row)}
              >
                <ShieldCheck size={13} /> Needs approval
              </button>
              {!row.check.approval.canRequest && (
                <small className="muted" style={{display: 'block', marginTop: 4}}>
                  Upload a file for this document first.
                </small>
              )}
              </>
            ) : (
              <>
                <span className="doc-approval-chip">
                  <ShieldCheck size={13} />
                  {row.check.approval.state === 'APPROVED' ? 'Approved' : row.check.approval.state === 'REJECTED' ? 'Rejected' : row.check.approval.state === 'REOPENED' ? 'Opened again' : 'Waiting'}
                </span>
                {(row.check.approval.state === 'REJECTED' || row.check.approval.state === 'REOPENED') && row.check.approval.canRequest && onRequestApproval && (
                  <button type="button" className="button small doc-needs" disabled={approvalBusy === row.chkId} onClick={() => onRequestApproval(row)}>
                    Submit again
                  </button>
                )}
              </>
            )}
            {(row.check.approval.steps || []).length > 1 &&
              (row.check.approval.steps || []).map((st: any) => (
                <small key={st.name} className="doc-approval-step" title={`Authority: ${st.authority}`}>
                  {st.name}: {st.status === 'APPROVED' ? 'approved' : st.status === 'PENDING' ? 'waiting' : st.status === 'REJECTED' ? 'rejected' : st.status === 'REOPENED' ? 'opened again' : st.status === 'WAITING' ? 'queued' : st.status === 'CANCELLED' ? 'closed' : '—'}
                </small>
              ))}
          </div>
        ) : (
          <small className="muted">No approval needed</small>
        )}
      </td>

      {/* Sumber Integrasi & Bukti */}
      <td>
        <DocumentSourceCell row={row} deletingFileId={deletingFileId} onDelete={onDelete} onPreviewFile={f => onPreview(row, f)} />
      </td>

      {/* Aksi */}
      <td style={{textAlign: 'right'}}>
        <DocumentRowActions
          row={row}
          isUploading={isUploading}
          deletingFileId={deletingFileId}
          onPreview={onPreview}
          onUpload={onUpload}
          onDelete={onDelete}
        />
      </td>
    </tr>
  );
}
