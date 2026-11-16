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
  onVerify,
  showStage,
}: {
  row: ChecklistRow;
  index: number;
  /** The stage column is hidden when the table is already grouped by stage. */
  showStage: boolean;
  isUploading: boolean;
  deletingFileId: string | null;
  onPreview: (row: ChecklistRow) => void;
  onUpload: (code: string) => void;
  onDelete: (fileId: string, code: string) => void;
  onVerify?: (row: ChecklistRow) => void;
}) {
  const checkedBy = [
    ['BS', row.check?.checkedByBs],
    ['CA', row.check?.checkedByCa],
    ['LEGAL', row.check?.checkedByLegal],
  ]
    .filter(([, done]) => done)
    .map(([dept]) => dept);
  return (
    <tr className={`doc-checklist-row ${row.isAvailable ? 'row-available' : 'row-pending'}`}>
      <td style={{textAlign: 'center', fontWeight: 600, color: '#64748b'}}>{index + 1}</td>
      {/* Dokumen Info */}
      <td>
        <div className="doc-meta-cell">
          <div className={`doc-code-badge badge-${row.department.toLowerCase()}`}>{row.code}</div>
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
        <span className={`dept-pill dept-${row.department.toLowerCase()}`}>{row.department}</span>
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
          {checkedBy.length > 0 && <small className="muted">Dicek: {checkedBy.join(', ')}</small>}
        </div>
      </td>

      {/* Sumber Integrasi & Bukti */}
      <td>
        <DocumentSourceCell row={row} deletingFileId={deletingFileId} onDelete={onDelete} />
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
          onVerify={onVerify}
        />
      </td>
    </tr>
  );
}
