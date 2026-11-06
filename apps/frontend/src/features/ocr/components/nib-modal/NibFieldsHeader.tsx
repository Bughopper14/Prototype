/** Right half: header of the extracted fields. */
import {Sparkles} from 'lucide-react';

export function NibFieldsHeader() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #f1f5f9',
        paddingBottom: 10,
        marginBottom: 12,
        flexShrink: 0,
      }}
    >
      <h4
        style={{
          margin: 0,
          fontSize: '0.92rem',
          fontWeight: 700,
          color: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Sparkles size={16} color="#2563eb" /> OCR Extracted Data
      </h4>
      <span style={{fontSize: '0.76rem', color: '#64748b'}}>Review & edit before applying</span>
    </div>
  );
}
