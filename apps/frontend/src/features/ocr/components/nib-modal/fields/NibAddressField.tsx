/** Domicile address. */
import {Check, Copy, MapPin} from 'lucide-react';
import {useNibOcrModalContext} from '@/features/ocr/components/nib-modal/NibOcrModalContext';

export function NibAddressField() {
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
          <MapPin size={13} color="#2563eb" /> Company Address / Domicile
        </label>
        {formData.alamat && (
          <button
            type="button"
            onClick={() => copyToClipboard('alamat', formData.alamat)}
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
            {copiedKey === 'alamat' ? <Check size={11} /> : <Copy size={11} />}
            {copiedKey === 'alamat' ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
      <textarea
        rows={2}
        value={formData.alamat}
        placeholder=""
        onChange={e => setFormData({...formData, alamat: e.target.value})}
        style={{
          width: '100%',
          padding: '7px 10px',
          fontSize: '0.84rem',
          borderRadius: 6,
          border: '1px solid #cbd5e1',
          resize: 'vertical',
          background: formData.alamat ? '#f0f7ff' : '#ffffff',
        }}
      />
    </div>
  );
}
