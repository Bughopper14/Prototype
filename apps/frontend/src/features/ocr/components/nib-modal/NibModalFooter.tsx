/** Cancel / apply buttons. */
import {Check} from 'lucide-react';

import {useNibOcrModalContext} from '@/features/ocr/components/nib-modal/NibOcrModalContext';

export function NibModalFooter() {
  const {onClose, ocrLoading, filledCount, handleApply, hasData} = useNibOcrModalContext();
  return (
    <div
      style={{
        padding: '12px 24px',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#f8fafc',
        flexShrink: 0,
      }}
    >
      <button
        type="button"
        className="button"
        onClick={onClose}
        style={{background: '#ffffff', borderColor: '#cbd5e1'}}
      >
        Cancel
      </button>
      <button
        type="button"
        className="button primary"
        disabled={!hasData || ocrLoading}
        onClick={handleApply}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: '#2563eb',
          borderColor: '#2563eb',
          padding: '8px 18px',
          fontSize: '0.88rem',
        }}
      >
        <Check size={16} />
        Apply to Form / Auto-Fill ({filledCount} Fields)
      </button>
    </div>
  );
}
