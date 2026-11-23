/** Full extracted address. */
import {Check, Copy, MapPin} from 'lucide-react';
import {useNibOcrModalContext} from '@/features/ocr/components/nib-modal/NibOcrModalContext';
import {parseAllAddressFields} from '@/features/ocr/lib/nib/address-wilayah';

export function NibFullAddressField() {
  const {copiedKey, formData, setFormData, copyToClipboard, master} = useNibOcrModalContext();
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
          <MapPin size={13} color="#2563eb" /> Company Full Address
        </label>
        {formData.fullAddress && (
          <button
            type="button"
            onClick={() => copyToClipboard('fullAddress', formData.fullAddress)}
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
            {copiedKey === 'fullAddress' ? <Check size={11} /> : <Copy size={11} />}
            {copiedKey === 'fullAddress' ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
      <textarea
        rows={2}
        value={formData.fullAddress}
        placeholder=""
        onChange={e => {
          const newFull = e.target.value;
          const parsed = parseAllAddressFields(newFull, master);
          setFormData({
            ...formData,
            fullAddress: newFull,
            alamat: parsed.alamat || (newFull ? formData.alamat : ''),
            province: parsed.province || formData.province,
            city: parsed.city || formData.city,
            district: parsed.district || formData.district,
            village: parsed.village || formData.village,
            postalCode: parsed.postalCode || formData.postalCode,
            rt: parsed.rt || formData.rt,
            rw: parsed.rw || formData.rw,
          });
        }}
        style={{
          width: '100%',
          padding: '7px 10px',
          fontSize: '0.84rem',
          borderRadius: 6,
          border: '1px solid #cbd5e1',
          resize: 'vertical',
          background: formData.fullAddress ? '#f0f7ff' : '#ffffff',
        }}
      />
    </div>
  );
}
