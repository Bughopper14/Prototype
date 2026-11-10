/** Company name. */
import {Building2, Check, Copy} from 'lucide-react';
import {useNibOcrModalContext} from '@/features/ocr/components/nib-modal/NibOcrModalContext';

export function NibCompanyNameField() {
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
          <Building2 size={13} color="#2563eb" /> Company Name
        </label>
        {formData.companyName && (
          <button
            type="button"
            onClick={() => copyToClipboard('companyName', formData.companyName)}
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
            {copiedKey === 'companyName' ? <Check size={11} /> : <Copy size={11} />}
            {copiedKey === 'companyName' ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
      <input
        type="text"
        value={formData.companyName}
        placeholder=""
        onChange={e => setFormData({...formData, companyName: e.target.value})}
        style={{
          width: '100%',
          padding: '7px 10px',
          fontSize: '0.84rem',
          borderRadius: 6,
          border: '1px solid #cbd5e1',
          fontWeight: 600,
          background: formData.companyName ? '#f0f7ff' : '#ffffff',
        }}
      />
    </div>
  );
}
