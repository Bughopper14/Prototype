/** OCR status bar (scanning, done, error). */
import {CheckCircle2, FileSearch, Loader2} from 'lucide-react';

import {useNibOcrModalContext} from '@/features/ocr/components/nib-modal/NibOcrModalContext';

export function NibStatusBar() {
  const {ocrLoading, filledCount, hasData} = useNibOcrModalContext();
  return (
    <div
      style={{
        padding: '12px 24px 0 24px',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 16px',
          borderRadius: 8,
          fontSize: '0.82rem',
          fontWeight: 500,
          background: ocrLoading ? '#eff6ff' : hasData ? '#f0fdf4' : '#f1f5f9',
          border: `1px solid ${ocrLoading ? '#bfdbfe' : hasData ? '#bbf7d0' : '#e2e8f0'}`,
          color: ocrLoading ? '#2563eb' : hasData ? '#166534' : '#64748b',
        }}
      >
        {ocrLoading ? (
          <>
            <Loader2 size={16} className="spin" />
            <span>Scanning and reading NIB document via OCR Engine...</span>
          </>
        ) : hasData ? (
          <>
            <CheckCircle2 size={16} color="#16a34a" />
            <span>{filledCount} fields detected and ready to sync to form</span>
          </>
        ) : (
          <>
            <FileSearch size={16} />
            <span>Please upload or drop a NIB document to start OCR processing</span>
          </>
        )}
      </div>
    </div>
  );
}
