/** One row of the checklist table matching the spatial micro-stepper mockup. */
import {Check, Clock, XCircle, X} from 'lucide-react';
import {DocumentApprovalCell} from '@/features/documents/components/checklist/DocumentApprovalCell';
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
  onOpenApprovalModal,
  onConfirmSubmit,
}: {
  row: ChecklistRow;
  index: number;
  /** The stage column is hidden when the table is already grouped by stage. */
  showStage: boolean;
  isUploading: boolean;
  deletingFileId: string | null;
  onPreview: (row: ChecklistRow, file?: any) => void;
  onUpload: (code: string, chkId?: string) => void;
  onDelete: (fileId: string, code: string) => void;
  onRequestApproval?: (row: ChecklistRow) => void;
  approvalBusy?: string | null;
  onOpenApprovalModal: (row: ChecklistRow) => void;
  onConfirmSubmit: (row: ChecklistRow) => void;
}) {
  const approval = row.check?.approval;
  const isRejected =
    row.status === 'REJECTED' ||
    approval?.state === 'REJECTED' ||
    (approval?.steps || []).some((s: any) => s.status === 'REJECTED');

  return (
    <tr className={`doc-checklist-row ${row.isAvailable ? 'row-available' : 'row-pending'}`}>
      {/* 1. NO */}
      <td className="col-no">{index + 1}</td>

      {/* 2. REQUIRED DOCUMENT */}
      <td className="col-doc">
        <div className="doc-meta-cell">
          <div className="doc-code-badge">{row.code}</div>
          <div className="doc-meta-content">
            <div className="doc-title">{row.name}</div>
            <div className="meta-tags-row">
              <span className={row.isMandatory ? 'tag-mandatory' : 'tag-optional'}>
                {row.isMandatory ? 'Mandatory' : 'Optional'}
              </span>
              {row.department && <span className="tag-bp">{row.department}</span>}
              {showStage && <StageBadge code={row.stage} name={row.stageName} />}
            </div>
            {row.description && <div className="doc-desc">{row.description}</div>}
          </div>
        </div>
      </td>

      {/* 3. STATUS & APPROVAL */}
      <td className="col-status">
        <div style={{marginBottom: '4px'}}>
          {isRejected ? (
            <span className="status-pill pill-rejected">
              <X size={12} strokeWidth={2.5} style={{marginRight: 4}} /> Needs Revision
            </span>
          ) : row.isAvailable ? (
            <span className="status-pill pill-available">
              <Check size={12} style={{marginRight: 4}} /> Available
            </span>
          ) : (
            <span className="status-pill pill-missing">
              <Clock size={12} style={{marginRight: 4}} /> Missing
            </span>
          )}
        </div>

        <DocumentApprovalCell
          row={row}
          onRequestApproval={onRequestApproval}
          approvalBusy={approvalBusy}
          onOpenModal={onOpenApprovalModal}
          onConfirmSubmit={onConfirmSubmit}
        />
      </td>

      {/* 4. FILE & SOURCE */}
      <td className="col-source">
        <DocumentSourceCell
          row={row}
          deletingFileId={deletingFileId}
          onDelete={onDelete}
          onPreviewFile={f => onPreview(row, f)}
        />
      </td>

      {/* 5. ACTIONS */}
      <td className="col-actions">
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
