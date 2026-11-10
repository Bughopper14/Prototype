/** Province, city, district, village, postal code, RT and RW. */
import {useNibOcrModalContext} from '@/features/ocr/components/nib-modal/NibOcrModalContext';

export function NibRegionFields() {
  const {formData, setFormData} = useNibOcrModalContext();
  return (
    <div
      style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <span
        style={{
          fontSize: '0.76rem',
          fontWeight: 700,
          color: '#002060',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        Administrative Regions
      </span>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
        <div>
          <label
            style={{
              fontSize: '0.76rem',
              fontWeight: 600,
              color: '#334155',
              display: 'block',
              marginBottom: 4,
            }}
          >
            Province
          </label>
          <input
            type="text"
            value={formData.province}
            placeholder=""
            onChange={e => setFormData({...formData, province: e.target.value})}
            style={{
              width: '100%',
              padding: '6px 10px',
              fontSize: '0.82rem',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: formData.province ? '#f0f7ff' : '#ffffff',
            }}
          />
        </div>

        <div>
          <label
            style={{
              fontSize: '0.76rem',
              fontWeight: 600,
              color: '#334155',
              display: 'block',
              marginBottom: 4,
            }}
          >
            City / Regency
          </label>
          <input
            type="text"
            value={formData.city}
            placeholder=""
            onChange={e => setFormData({...formData, city: e.target.value})}
            style={{
              width: '100%',
              padding: '6px 10px',
              fontSize: '0.82rem',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: formData.city ? '#f0f7ff' : '#ffffff',
            }}
          />
        </div>

        <div>
          <label
            style={{
              fontSize: '0.76rem',
              fontWeight: 600,
              color: '#334155',
              display: 'block',
              marginBottom: 4,
            }}
          >
            District
          </label>
          <input
            type="text"
            value={formData.district}
            placeholder=""
            onChange={e => setFormData({...formData, district: e.target.value})}
            style={{
              width: '100%',
              padding: '6px 10px',
              fontSize: '0.82rem',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: formData.district ? '#f0f7ff' : '#ffffff',
            }}
          />
        </div>

        <div>
          <label
            style={{
              fontSize: '0.76rem',
              fontWeight: 600,
              color: '#334155',
              display: 'block',
              marginBottom: 4,
            }}
          >
            Village / Sub-district
          </label>
          <input
            type="text"
            value={formData.village}
            placeholder=""
            onChange={e => setFormData({...formData, village: e.target.value})}
            style={{
              width: '100%',
              padding: '6px 10px',
              fontSize: '0.82rem',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: formData.village ? '#f0f7ff' : '#ffffff',
            }}
          />
        </div>

        <div>
          <label
            style={{
              fontSize: '0.76rem',
              fontWeight: 600,
              color: '#334155',
              display: 'block',
              marginBottom: 4,
            }}
          >
            Postal / Zip Code
          </label>
          <input
            type="text"
            value={formData.postalCode}
            placeholder=""
            onChange={e =>
              setFormData({...formData, postalCode: e.target.value.replace(/\D/g, '').slice(0, 5)})
            }
            style={{
              width: '100%',
              padding: '6px 10px',
              fontSize: '0.82rem',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: formData.postalCode ? '#f0f7ff' : '#ffffff',
            }}
          />
        </div>

        <div>
          <label
            style={{
              fontSize: '0.76rem',
              fontWeight: 600,
              color: '#334155',
              display: 'block',
              marginBottom: 4,
            }}
          >
            RT / RW
          </label>
          <div style={{display: 'flex', gap: 6, alignItems: 'center'}}>
            <input
              type="text"
              value={formData.rt}
              maxLength={3}
              placeholder=""
              onChange={e => setFormData({...formData, rt: e.target.value.replace(/\D/g, '')})}
              style={{
                width: '50%',
                padding: '6px 10px',
                fontSize: '0.82rem',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: formData.rt ? '#f0f7ff' : '#ffffff',
              }}
            />
            <span style={{color: '#94a3b8'}}>/</span>
            <input
              type="text"
              value={formData.rw}
              maxLength={3}
              placeholder=""
              onChange={e => setFormData({...formData, rw: e.target.value.replace(/\D/g, '')})}
              style={{
                width: '50%',
                padding: '6px 10px',
                fontSize: '0.82rem',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: formData.rw ? '#f0f7ff' : '#ffffff',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
