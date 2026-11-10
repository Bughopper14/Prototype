/** The checklist table with its rows and the empty state. */
import {AlertCircle} from 'lucide-react';
import {ChecklistRowItem} from '@/features/documents/components/checklist/ChecklistRowItem';
import type {ChecklistRow} from '@/features/documents/lib/checklist/types';

export function ChecklistTable({
  rows,
  uploadingCode,
  deletingFileId,
  onPreview,
  onUpload,
  onDelete,
}: {
  rows: ChecklistRow[];
  uploadingCode: string | null;
  deletingFileId: string | null;
  onPreview: (row: ChecklistRow) => void;
  onUpload: (code: string) => void;
  onDelete: (fileId: string, code: string) => void;
}) {
  return (
    <div className="table-scroll doc-table-wrapper">
      <table className="data-table doc-checklist-table">
        <thead>
          <tr>
            <th style={{width: '40px', textAlign: 'center'}}>NO</th>
            <th style={{minWidth: '220px'}}>DOKUMEN PERSYARATAN</th>
            <th style={{width: '130px'}}>DEPARTEMEN</th>
            <th style={{width: '120px'}}>SIFAT</th>
            <th style={{width: '150px'}}>STATUS KELENGKAPAN</th>
            <th style={{minWidth: '260px'}}>SUMBER / KETERANGAN INTEGRASI</th>
            <th style={{width: '180px', textAlign: 'right'}}>AKSI</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <ChecklistRowItem
              key={row.code}
              row={row}
              index={idx}
              isUploading={uploadingCode === row.code}
              deletingFileId={deletingFileId}
              onPreview={onPreview}
              onUpload={onUpload}
              onDelete={onDelete}
            />
          ))}

          {!rows.length && (
            <tr>
              <td colSpan={7} style={{textAlign: 'center', padding: '40px 20px'}}>
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
