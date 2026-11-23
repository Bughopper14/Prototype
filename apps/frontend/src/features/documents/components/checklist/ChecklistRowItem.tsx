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
      {/* Dokumen Info & Metadata */}
      <td>
        <div className="doc-meta-cell">
          <div className={`doc-code-badge badge-${(row.department || '').toLowerCase()}`}>{row.code}</div>
          <div className="doc-meta-content">
            <strong className="doc-primary-name">{row.name}</strong>
            <div className="doc-meta-tags">
              {row.isMandatory ? (
                <span className="mandatory-tag tag-required">Mandatory</span>
              ) : (
                <span className="mandatory-tag tag-optional">Optional</span>
              )}
              {row.department && (
                <span className={`dept-pill dept-${row.department.toLowerCase()}`}>{row.department}</span>
              )}
              {showStage && (
                <StageBadge code={row.stage} name={row.stageName} />
              )}
            </div>
            {row.description && <span className="doc-sub-desc">{row.description}</span>}
          </div>
        </div>
      </td>

      {/* Status Kelengkapan & Approval */}
      <td>
        <div className="doc-status-approval-cell">
          <div className="doc-status-row">
            {row.isAvailable ? (
              <span className="status-pill status-ready">
                <CheckCircle2 size={13} style={{marginRight: 4}} /> Available
              </span>
            ) : (
              <span className="status-pill status-missing">
                <Clock size={13} style={{marginRight: 4}} /> Missing
              </span>
            )}
            {row.status === 'VERIFIED' && (
              <span className="status-pill status-ready">
                <ShieldCheck size={13} style={{marginRight: 4}} /> Verified
              </span>
            )}
            {row.status === 'REJECTED' && (
              <span className="status-pill status-missing">
                <XCircle size={13} style={{marginRight: 4}} /> Rejected
              </span>
            )}
          </div>

          <div className="doc-approval-row">
            {row.check?.approval ? (
              <div className={'doc-approval ' + String(row.check.approval.state).toLowerCase()}>
                {row.check.approval.state === 'NOT_REQUESTED' ? (
                  <button
                    type="button"
                    className="button small doc-needs"
                    disabled={!onRequestApproval || !row.check.approval.canRequest || approvalBusy === row.chkId}
                    title={row.check.approval.canRequest ? 'Send this document for approval' : 'Upload the document first'}
                    onClick={() => onRequestApproval?.(row)}
                  >
                    <ShieldCheck size={13} /> Needs approval
                  </button>
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
              <small className="muted" style={{fontSize: '11px'}}>No approval needed</small>
            )}
          </div>
        </div>
      </td>

      {/* Sumber Integrasi & Bukti */}
      <td className="col-source">
        <DocumentSourceCell row={row} deletingFileId={deletingFileId} onDelete={onDelete} onPreviewFile={f => onPreview(row, f)} />
      </td>

      {/* Aksi */}
      <td className="col-actions" style={{textAlign: 'center'}}>
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
