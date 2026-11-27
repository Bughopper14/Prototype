/** One row of the checklist table matching the clean stage-tabbed mockup. */
import {getShortRoleLabel} from '@/features/documents/components/checklist/DocumentApprovalCell';
import {formatBytes} from '@/features/documents/lib/checklist/format-bytes';
import type {ChecklistRow} from '@/features/documents/lib/checklist/types';
import {Check, ChevronRight, Clock, Eye, MoreHorizontal, Paperclip, Upload, X} from 'lucide-react';
import {useMemo, useState} from 'react';

function formatShortUpdated(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `updated ${d.getDate()} ${months[d.getMonth()]}`;
}

export function ChecklistRowItem({
  row,
  isUploading,
  deletingFileId,
  onInspect,
  onUpload,
  onDelete,
  onRequestApproval,
}: {
  row: ChecklistRow;
  index: number;
  showStage: boolean;
  isUploading: boolean;
  deletingFileId: string | null;
  onPreview: (row: ChecklistRow, file?: any) => void;
  onInspect: (row: ChecklistRow) => void;
  onUpload: (code: string, chkId?: string) => void;
  onDelete: (fileId: string, code: string) => void;
  onRequestApproval?: (row: ChecklistRow) => void;
  approvalBusy?: string | null;
  onOpenApprovalModal: (row: ChecklistRow) => void;
  onConfirmSubmit: (row: ChecklistRow) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const files = row.files || [];
  const hasFile = files.length > 0;
  const currentFile = files.find((f: any) => f.isCurrent) || files[files.length - 1] || null;

  const approval = row.check?.approval;
  const steps: any[] = approval?.steps || [];
  const totalSteps = steps.length;
  const approvedSteps = steps.filter((s: any) => s.status === 'APPROVED').length;
  const isRejected =
    !approval?.reopened &&
    (row.check?.approvalStatus === 'REJECTED' ||
      approval?.state === 'REJECTED' ||
      steps.some((s: any) => s.status === 'REJECTED' && !s.reopened));
  const isApproved =
    !isRejected &&
    !approval?.reopened &&
    (row.check?.approvalStatus === 'APPROVED' ||
      approval?.state === 'APPROVED' ||
      (totalSteps > 0 && approvedSteps === totalSteps));
  const isInReview = !isApproved && !isRejected && approval?.state === 'IN_APPROVAL';
  const canSubmit = hasFile && !!onRequestApproval && !!approval?.canRequest && !isInReview;
  const isLocked = isInReview;

  const tiers = useMemo(() => {
    const map = new Map<number, any[]>();
    steps.forEach((s: any, idx: number) => {
      const ord = Number(s.order ?? s.sortOrder ?? idx + 1);
      const arr = map.get(ord) || [];
      arr.push({...s, _idx: idx});
      map.set(ord, arr);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([order, items]) => ({order, items}));
  }, [steps]);

  const ext = currentFile?.fileName ? String(currentFile.fileName).split('.').pop()?.toUpperCase() || 'FILE' : '';

  const dotClass = isApproved
    ? 'doc-chk-dot--approved'
    : isRejected
      ? 'doc-chk-dot--rejected'
      : isInReview
        ? 'doc-chk-dot--review'
        : hasFile
          ? 'doc-chk-dot--ready'
          : 'doc-chk-dot--missing';

  const statusTitle = !hasFile
    ? 'Waiting for file'
    : isApproved
      ? 'Approved'
      : isInReview
        ? 'In review'
        : isRejected
          ? 'Needs changes'
          : 'Ready to submit';

  const statusColor = !hasFile
    ? '#64748b'
    : isApproved
      ? '#16a34a'
      : isInReview
        ? '#d97706'
        : isRejected
          ? '#dc2626'
          : '#2563eb';

  const statusSub = !hasFile
    ? 'Upload a file to start'
    : isApproved
      ? `All ${Math.max(1, totalSteps)} approved`
      : isInReview
        ? `${approvedSteps}/${totalSteps} approved`
        : isRejected
          ? 'Re-upload or resubmit'
          : totalSteps > 0
            ? `${totalSteps} approval${totalSteps > 1 ? 's' : ''} after submit`
            : 'Uploaded';

  const manualFile = files.find((f: any) => !f.isAuto);

  return (
    <tr className="doc-chk-row">
      {/* 1. DOCUMENT */}
      <td>
        <div className="doc-chk-doc-cell">
          <span className={`doc-chk-dot ${dotClass}`}>
            {isApproved && <Check size={10} strokeWidth={3} />}
            {isInReview && <Clock size={10} />}
            {isRejected && <X size={10} strokeWidth={3} />}
          </span>
          <div>
            <div className="doc-chk-name">{row.name}</div>
            <div className="doc-chk-sub-row">
              {hasFile ? (
                <>
                  <button
                    type="button"
                    className="doc-chk-files-pill"
                    onClick={() => onInspect(row)}
                  >
                    <Paperclip size={11} />
                    <span>
                      {files.length} {files.length === 1 ? 'file' : 'files'}
                    </span>
                    <ChevronRight size={11} />
                  </button>
                  <span className="doc-chk-file-meta">
                    {ext}
                    {files.length === 1 && currentFile?.fileSize
                      ? `, ${formatBytes(currentFile.fileSize)}`
                      : currentFile?.createdAt
                        ? `, ${formatShortUpdated(currentFile.createdAt)}`
                        : ''}
                  </span>
                </>
              ) : (
                <span className="doc-chk-file-meta">No file uploaded yet</span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* 2. APPROVAL */}
      <td>
        {tiers.length > 0 ? (
          <div className="doc-chk-stepper">
            {tiers.map((tier, tIdx) => {
              const allTierApproved = tier.items.every((s: any) => s.status === 'APPROVED');
              const anyTierRejected = tier.items.some((s: any) => s.status === 'REJECTED' && !s.reopened);
              const anyTierPending = tier.items.some((s: any) => s.status === 'PENDING');
              const tierCls = allTierApproved
                ? 'is-approved'
                : anyTierRejected
                  ? 'is-rejected'
                  : anyTierPending
                    ? 'is-pending'
                    : '';
              const label = tier.items.map((s: any) => getShortRoleLabel(s, s._idx)).join(' + ');

              return (
                <div key={tier.order} className="doc-chk-tier">
                  <div className="doc-chk-tier-top">
                    <span className={`doc-chk-tier-circle ${tierCls}`}>
                      {allTierApproved ? <Check size={11} strokeWidth={3} /> : tIdx + 1}
                    </span>
                  </div>
                  <span className="doc-chk-tier-label">{label}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            <div className="doc-chk-status-title" style={{color: '#475569'}}>
              No approval needed
            </div>
            <div className="doc-chk-status-sub">
              {row.isMandatory ? 'Required document' : 'Optional document'}
            </div>
          </div>
        )}
      </td>

      {/* 3. STATUS */}
      <td>
        <div className="doc-chk-status-title" style={{color: statusColor}}>
          {statusTitle}
        </div>
        <div className="doc-chk-status-sub">{statusSub}</div>
      </td>

      {/* 4. ACTIONS */}
      <td>
        <div className="doc-chk-actions-cell">
          {!hasFile ? (
            <button
              type="button"
              className="doc-inspect-btn"
              disabled={isUploading || isLocked}
              onClick={() => onUpload(row.code, row.chkId)}
            >
              <Upload size={13} />
              <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
            </button>
          ) : canSubmit ? (
            <button
              type="button"
              className="doc-inspect-btn doc-inspect-btn--primary"
              style={{flex: 'none', padding: '6px 14px'}}
              onClick={() => onInspect(row)}
            >
              <span>Submit</span>
            </button>
          ) : (
            <button
              type="button"
              className="doc-inspect-btn"
              onClick={() => onInspect(row)}
            >
              <Eye size={13} />
              <span>View</span>
            </button>
          )}

          <button
            type="button"
            className="icon-button"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="More actions"
          >
            <MoreHorizontal size={16} />
          </button>

          {menuOpen && (
            <div className="doc-chk-menu-pop" onMouseLeave={() => setMenuOpen(false)}>
              {hasFile && (
                <button
                  type="button"
                  className="doc-chk-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onInspect(row);
                  }}
                >
                  Inspect &amp; preview
                </button>
              )}
              {!isLocked && (
                <button
                  type="button"
                  className="doc-chk-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onUpload(row.code, row.chkId);
                  }}
                >
                  {hasFile ? 'Upload / Replace file' : 'Upload file'}
                </button>
              )}
              {manualFile && !isLocked && (
                <button
                  type="button"
                  className="doc-chk-menu-item is-danger"
                  disabled={deletingFileId === manualFile.id}
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(manualFile.id, row.code);
                  }}
                >
                  Delete file
                </button>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
