/** Right half: editable fields read from the NIB. */
import {Building2, Calendar, Check, Copy, Hash, Mail, MapPin, Phone} from 'lucide-react';

import {useNibOcrModalContext} from '@/features/ocr/components/nib-modal/NibOcrModalContext';

export function NibExtractedFields() {
  const {copiedKey, formData, setFormData, copyToClipboard} = useNibOcrModalContext();
  const isEmailValid =
    !formData.email || /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email.trim());
  return (
    <div
      style={{
        flex: '1 1 0',
        overflowY: 'auto',
        paddingRight: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: 0,
      }}
    >
      {/* FIELD 1: NIB NUMBER */}
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

      {/* FIELD 2: COMPANY NAME */}
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

      {/* FIELD 3: DOMICILE ADDRESS */}
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

      {/* ADMINISTRATIVE REGIONS (ALL IN ENGLISH, CLEAN 2-COLUMN GRID) */}
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

      {/* FIELD: EMAIL & PHONE NUMBER */}
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
              Format email tidak valid (contoh: nama@perusahaan.co.id)
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

      {/* FIELD: TANGGAL TERBIT NIB */}
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
    </div>
  );
}
