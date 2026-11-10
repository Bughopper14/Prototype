/** Date the NIB was issued. */
import {Calendar, Check, Copy} from 'lucide-react';
import {useNibOcrModalContext} from '@/features/ocr/components/nib-modal/NibOcrModalContext';

export function NibIssueDateField() {
  const {copiedKey, formData, setFormData, copyToClipboard} = useNibOcrModalContext();
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        <label
          style={{
            fontSize: '0.78rem',
            fontWeight: 600,
            color: '#334155',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Calendar size={13} color="#2563eb" /> NIB Issued Date
        </label>
        {formData.tanggalTerbit && (
          <button
            type="button"
            onClick={() => copyToClipboard('tgl', formData.tanggalTerbit)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.72rem',
              color: '#2563eb',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            {copiedKey === 'tgl' ? <Check size={11} /> : <Copy size={11} />}
            {copiedKey === 'tgl' ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
      <input
        type="date"
        value={formData.tanggalTerbit}
        onChange={e => setFormData({...formData, tanggalTerbit: e.target.value})}
        style={{
          width: '100%',
          padding: '7px 10px',
          fontSize: '0.84rem',
          borderRadius: 6,
          border: '1px solid #cbd5e1',
          background: formData.tanggalTerbit ? '#f0f7ff' : '#ffffff',
        }}
      />
    </div>
  );
}
