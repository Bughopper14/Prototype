/** Differences found by the OCR comparison. */
import {CheckCheck, ScanLine} from 'lucide-react';

export function ArchiveDiscrepancies({discrepancies}: {discrepancies: any[]}) {
  return (
    <div style={{background: '#ffffff', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0'}}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 13,
            color: '#002060',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <ScanLine size={16} />
          <span>Perbandingan System FAP vs Hasil Dokumen OCR ({discrepancies.length} perbedaan)</span>
        </div>
        <span className="subtle-chip" style={{fontSize: 11}}>
          {discrepancies.length === 0
            ? '✓ Matched / No Discrepancy'
            : `${discrepancies.length} Field(s) Differ`}
        </span>
      </div>

      {discrepancies.length === 0 ? (
        <div
          style={{
            padding: '16px',
            background: '#ecfdf5',
            borderRadius: 6,
            border: '1px solid #a7f3d0',
            color: '#065f46',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CheckCheck size={18} style={{color: '#059669'}} />
          <span>
            Semua kolom data sistem FAP yang dibandingkan telah sesuai atau tidak ditemukan perbedaan dengan
            dokumen fisik OCR.
          </span>
        </div>
      ) : (
        <div style={{overflowX: 'auto'}}>
          <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 12}}>
            <thead>
              <tr style={{background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left'}}>
                <th style={{padding: '8px 10px', color: '#475569', fontWeight: 600}}>Field Name</th>
                <th style={{padding: '8px 10px', color: '#002060', fontWeight: 600}}>System FAP Record</th>
                <th style={{padding: '8px 10px', color: '#b45309', fontWeight: 600}}>
                  Scanned Document (OCR)
                </th>
                <th style={{padding: '8px 10px', color: '#475569', fontWeight: 600, width: 100}}>Status</th>
              </tr>
            </thead>
            <tbody>
              {discrepancies.map((diff: any, i: number) => (
                <tr key={diff.field || i} style={{borderBottom: '1px solid #e2e8f0'}}>
                  <td style={{padding: '8px 10px', fontWeight: 600, color: '#334155'}}>
                    {diff.label || diff.field}
                  </td>
                  <td style={{padding: '8px 10px', color: '#0f172a', background: '#f8fafc'}}>
                    {diff.oldValue || diff.systemValue || '—'}
                  </td>
                  <td
                    style={{
                      padding: '8px 10px',
                      color: '#b45309',
                      background: '#fffbeb',
                      fontWeight: 500,
                    }}
                  >
                    {diff.newValue || diff.ocrValue || '—'}
                  </td>
                  <td style={{padding: '8px 10px'}}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        background: '#fef3c7',
                        color: '#92400e',
                      }}
                    >
                      DIFFERENT
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
