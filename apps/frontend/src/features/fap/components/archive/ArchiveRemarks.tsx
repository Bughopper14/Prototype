/** Remarks written during the document comparison. */
import {FileText} from 'lucide-react';

export function ArchiveRemarks({current}: {current: any}) {
  return (
    <div style={{background: '#fefce8', padding: 14, borderRadius: 8, border: '1px solid #fef08a'}}>
      <div
        style={{
          fontWeight: 700,
          fontSize: 13,
          color: '#854d0e',
          marginBottom: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <FileText size={16} />
        <span>Remarks &amp; Notes Tambahan dari Perbandingan Dokumen</span>
      </div>
      <div
        style={{
          fontSize: 13,
          color: '#713f12',
          background: '#ffffff',
          padding: '10px 12px',
          borderRadius: 6,
          border: '1px solid #fef08a',
          minHeight: 40,
          whiteSpace: 'pre-wrap',
        }}
      >
        {current.comparison_remarks ||
          'Tidak ada catatan khusus / keterangan remarks tambahan saat verifikasi dokumen FAP.'}
      </div>
    </div>
  );
}
