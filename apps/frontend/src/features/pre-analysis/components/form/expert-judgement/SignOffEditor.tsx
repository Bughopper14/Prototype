/** Propose / review / approve sign-off cards. */
import {usePreAnalysis} from '@/features/pre-analysis/components/PreAnalysisContext';

export function SignOffEditor() {
  const {data, scrollToPreviewElement, updateField} = usePreAnalysis();
  return (
    <div style={{marginTop: '20px', borderTop: '1px solid #cbd5e1', paddingTop: '16px'}}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <div>
          <span style={{fontSize: '0.85rem', fontWeight: 700, color: '#1e3a8a'}}>
            Area Tanda Tangan & Otorisasi Komite
          </span>
          <div style={{fontSize: '0.7rem', color: '#64748b'}}>
            Signature columns for formal executive authorization (Proposed, Reviewed, Approved)
          </div>
        </div>
        <span
          style={{
            fontSize: '0.7rem',
            background: '#dbeafe',
            color: '#1e40af',
            padding: '2px 8px',
            borderRadius: '4px',
            fontWeight: 600,
          }}
        >
          3 Komite Wajib
        </span>
      </div>

      <div style={{display: 'flex', flexDirection: 'column', gap: '14px'}}>
        {/* Propose by Card */}
        <div
          style={{
            border: '1.5px solid #cbd5e1',
            borderRadius: '8px',
            background: '#f8fafc',
            padding: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <span style={{fontSize: '0.8rem', fontWeight: 700, color: '#0f172a'}}>1. Proposed by :</span>
            <span
              style={{
                fontSize: '0.7rem',
                background: '#eff6ff',
                color: '#1e40af',
                border: '1px solid #bfdbfe',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 600,
              }}
            >
              Marketing / Sales
            </span>
          </div>
          <div
            style={{
              height: '75px',
              border: '1.5px dashed #94a3b8',
              borderRadius: '6px',
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              marginBottom: '10px',
            }}
          >
            <span style={{fontSize: '0.75rem', color: '#64748b', fontWeight: 600}}>
              ( Ruang Tanda Tangan Basah / Digital & Stempel )
            </span>
            <span style={{fontSize: '0.68rem', color: '#94a3b8'}}>Area tanda tangan diperlebar</span>
          </div>
          <label
            style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              color: '#475569',
              display: 'block',
              marginBottom: '4px',
            }}
          >
            Proposed By (Name & Title) :
          </label>
          <textarea
            rows={2}
            name="proposedBy"
            data-field="proposedBy"
            value={data.proposedBy}
            onChange={e => updateField('proposedBy', e.target.value)}
            onFocus={() => scrollToPreviewElement('preana-preview-cell-proposedBy')}
            placeholder="Amanda Cynthia&#10;Senior Account Manager"
            style={{
              width: '100%',
              padding: '8px 10px',
              fontSize: '0.8rem',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              lineHeight: 1.4,
            }}
          />
        </div>

        {/* Reviewed by Card */}
        <div
          style={{
            border: '1.5px solid #cbd5e1',
            borderRadius: '8px',
            background: '#f8fafc',
            padding: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <span style={{fontSize: '0.8rem', fontWeight: 700, color: '#0f172a'}}>2. Reviewed by :</span>
            <span
              style={{
                fontSize: '0.7rem',
                background: '#fef3c7',
                color: '#92400e',
                border: '1px solid #fde68a',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 600,
              }}
            >
              Risk & Credit Dept Head
            </span>
          </div>
          <div
            style={{
              height: '75px',
              border: '1.5px dashed #94a3b8',
              borderRadius: '6px',
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              marginBottom: '10px',
            }}
          >
            <span style={{fontSize: '0.75rem', color: '#64748b', fontWeight: 600}}>
              ( Ruang Tanda Tangan Basah / Digital & Stempel )
            </span>
            <span style={{fontSize: '0.68rem', color: '#94a3b8'}}>Area tanda tangan diperlebar</span>
          </div>
          <label
            style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              color: '#475569',
              display: 'block',
              marginBottom: '4px',
            }}
          >
            Reviewed By (Name & Title) :
          </label>
          <textarea
            rows={2}
            name="reviewedBy"
            data-field="reviewedBy"
            value={data.reviewedBy}
            onChange={e => updateField('reviewedBy', e.target.value)}
            onFocus={() => scrollToPreviewElement('preana-preview-cell-reviewedBy')}
            placeholder="Maria Regina&#10;Dept. Head"
            style={{
              width: '100%',
              padding: '8px 10px',
              fontSize: '0.8rem',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              lineHeight: 1.4,
            }}
          />
        </div>

        {/* Approved by Card */}
        <div
          style={{
            border: '1.5px solid #cbd5e1',
            borderRadius: '8px',
            background: '#f8fafc',
            padding: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <span style={{fontSize: '0.8rem', fontWeight: 700, color: '#0f172a'}}>3. Approved by :</span>
            <span
              style={{
                fontSize: '0.7rem',
                background: '#dcfce7',
                color: '#166534',
                border: '1px solid #bbf7d0',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 600,
              }}
            >
              Director / Credit Committee
            </span>
          </div>
          <div
            style={{
              height: '75px',
              border: '1.5px dashed #94a3b8',
              borderRadius: '6px',
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              marginBottom: '10px',
            }}
          >
            <span style={{fontSize: '0.75rem', color: '#64748b', fontWeight: 600}}>
              ( Ruang Tanda Tangan Basah / Digital & Stempel )
            </span>
            <span style={{fontSize: '0.68rem', color: '#94a3b8'}}>Area tanda tangan diperlebar</span>
          </div>
          <label
            style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              color: '#475569',
              display: 'block',
              marginBottom: '4px',
            }}
          >
            Approved By (Name & Title) :
          </label>
          <textarea
            rows={2}
            name="approvedBy"
            data-field="approvedBy"
            value={data.approvedBy}
            onChange={e => updateField('approvedBy', e.target.value)}
            onFocus={() => scrollToPreviewElement('preana-preview-cell-approvedBy')}
            placeholder="Jembar Ganda E&#10;Director"
            style={{
              width: '100%',
              padding: '8px 10px',
              fontSize: '0.8rem',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              lineHeight: 1.4,
            }}
          />
        </div>
      </div>
    </div>
  );
}
