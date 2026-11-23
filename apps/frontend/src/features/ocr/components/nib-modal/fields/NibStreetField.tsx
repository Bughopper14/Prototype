/** The street / building part of the address: what the region fields below do not hold (street name, number, building). */
import {Check, Copy, Route} from 'lucide-react';
import {useNibOcrModalContext} from '@/features/ocr/components/nib-modal/NibOcrModalContext';

export function NibStreetField() {
  const {copiedKey, formData, setFormData, copyToClipboard} = useNibOcrModalContext();
  return (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4}}>
        <label style={{fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 5}}>
          <Route size={13} color="#2563eb" /> Street Address
        </label>
        {formData.streetAddress && (
          <button
            type="button"
            onClick={() => copyToClipboard('streetAddress', formData.streetAddress)}
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
            {copiedKey === 'streetAddress' ? <Check size={11} /> : <Copy size={11} />}
            {copiedKey === 'streetAddress' ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
      <input
        type="text"
        value={formData.streetAddress}
        placeholder=""
        onChange={e => setFormData({...formData, streetAddress: e.target.value})}
        style={{
          width: '100%',
          padding: '7px 10px',
          fontSize: '0.84rem',
          borderRadius: 6,
          border: '1px solid #cbd5e1',
          background: formData.streetAddress ? '#f0f7ff' : '#ffffff',
        }}
      />
    </div>
  );
}
