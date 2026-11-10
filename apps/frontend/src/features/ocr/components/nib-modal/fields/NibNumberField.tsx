/** NIB number. */
import {Check, Copy, Hash} from 'lucide-react';
import {useNibOcrModalContext} from '@/features/ocr/components/nib-modal/NibOcrModalContext';

export function NibNumberField() {
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
          <Hash size={13} color="#2563eb" /> NIB Number (13 Digits)
        </label>
        {formData.nib && (
          <button
            type="button"
            onClick={() => copyToClipboard('nib', formData.nib)}
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
            {copiedKey === 'nib' ? <Check size={11} /> : <Copy size={11} />}
            {copiedKey === 'nib' ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
      <input
        type="text"
        value={formData.nib}
        maxLength={13}
        placeholder=""
        onChange={e => setFormData({...formData, nib: e.target.value.replace(/\D/g, '')})}
        style={{
          width: '100%',
          padding: '7px 10px',
          fontSize: '0.84rem',
          borderRadius: 6,
          border: '1px solid #cbd5e1',
          fontWeight: 600,
          background: formData.nib ? '#f0f7ff' : '#ffffff',
        }}
      />
    </div>
  );
}
