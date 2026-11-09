/** NIB OCR modal header. */
import {ScanLine, X} from 'lucide-react';

import {useNibOcrModalContext} from '@/features/ocr/components/nib-modal/NibOcrModalContext';

export function NibModalHeader() {
  const {onClose} = useNibOcrModalContext();
  return (
    <div
      style={{
        padding: '14px 24px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#f8fafc',
        flexShrink: 0,
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            background: '#2563eb',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ScanLine size={22} />
        </div>
        <div>
          <h3 style={{margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a'}}>
            Upload & Scan NIB Document · Auto-Fill OCR
          </h3>
          <p style={{margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748b'}}>
            Automatically extract NIB number, company name, domicile address, administrative regions,
            contacts, and issue date.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="icon-button"
        aria-label="Close"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: '#64748b',
          padding: 6,
        }}
      >
        <X size={22} />
      </button>
    </div>
  );
}
