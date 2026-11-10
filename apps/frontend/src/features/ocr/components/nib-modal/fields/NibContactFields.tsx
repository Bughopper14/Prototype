/** E-mail and phone number. */
import {Mail, Phone} from 'lucide-react';
import {useNibOcrModalContext} from '@/features/ocr/components/nib-modal/NibOcrModalContext';

export function NibContactFields() {
  const {formData, setFormData, emailError} = useNibOcrModalContext();
  const isEmailValid = !emailError;
  return (
    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
      <div>
        <label
          style={{
            fontSize: '0.78rem',
            fontWeight: 600,
            color: '#334155',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            marginBottom: 4,
          }}
        >
          <Mail size={13} color="#2563eb" /> Company Email
        </label>
        <input
          type="email"
          value={formData.email}
          placeholder=""
          onChange={e => setFormData({...formData, email: e.target.value})}
          style={{
            width: '100%',
            padding: '7px 10px',
            fontSize: '0.84rem',
            borderRadius: 6,
            border: `1px solid ${!isEmailValid ? '#ef4444' : '#cbd5e1'}`,
            background: !isEmailValid ? '#fef2f2' : formData.email ? '#f0f7ff' : '#ffffff',
          }}
        />
        {!isEmailValid && (
          <span style={{fontSize: '0.72rem', color: '#ef4444', marginTop: 2, display: 'block'}}>
            {emailError}
          </span>
        )}
      </div>

      <div>
        <label
          style={{
            fontSize: '0.78rem',
            fontWeight: 600,
            color: '#334155',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            marginBottom: 4,
          }}
        >
          <Phone size={13} color="#2563eb" /> Phone Number
        </label>
        <input
          type="text"
          value={formData.phone}
          placeholder=""
          onChange={e => setFormData({...formData, phone: e.target.value})}
          style={{
            width: '100%',
            padding: '7px 10px',
            fontSize: '0.84rem',
            borderRadius: 6,
            border: '1px solid #cbd5e1',
            background: formData.phone ? '#f0f7ff' : '#ffffff',
          }}
        />
      </div>
    </div>
  );
}
