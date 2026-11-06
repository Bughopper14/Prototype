import {NibExtractedFields} from '@/features/ocr/components/nib-modal/NibExtractedFields';
import {NibFieldsHeader} from '@/features/ocr/components/nib-modal/NibFieldsHeader';
import {NibModalFooter} from '@/features/ocr/components/nib-modal/NibModalFooter';
import {NibModalHeader} from '@/features/ocr/components/nib-modal/NibModalHeader';
import {NibOcrModalContext} from '@/features/ocr/components/nib-modal/NibOcrModalContext';
import {NibStatusBar} from '@/features/ocr/components/nib-modal/NibStatusBar';
import {NibUploadZone} from '@/features/ocr/components/nib-modal/NibUploadZone';
import {useNibOcrModal, type NibOcrModalProps} from '@/features/ocr/hooks/useNibOcrModal';

export function NibOcrModal(props: NibOcrModalProps) {
  const state = useNibOcrModal(props);
  const {onClose} = state;
  if (!props.open) return null;
  return (
    <NibOcrModalContext.Provider value={state}>
      <div
        className="modal-scrim nib-ocr-modal-overlay"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          boxSizing: 'border-box',
        }}
      >
        <div
          className="modal nib-ocr-modal"
          onClick={e => e.stopPropagation()}
          style={{
            width: 'min(1820px, 98vw)',
            maxWidth: '98vw',
            maxHeight: '94vh',
            height: 'min(960px, 94vh)',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            background: '#ffffff',
            borderRadius: '14px',
            boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.45)',
            overflow: 'hidden',
            position: 'relative',
            zIndex: 100000,
          }}
        >
          {/* MODAL HEADER */}
          <NibModalHeader />

          {/* STATUS NOTIFICATION BAR (ABOVE DOCUMENT VIEWER & OCR RESULTS) */}
          <NibStatusBar />

          {/* MODAL BODY (50% LEFT VIEWER, 50% RIGHT FORM) */}
          <div
            style={{
              padding: '12px 24px 18px 24px',
              overflow: 'hidden',
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1fr)',
              gap: 22,
              flex: '1 1 auto',
              minHeight: 0,
            }}
          >
            {/* LEFT: UPLOAD & FILE ZONE (50% VIEW) */}
            <NibUploadZone />

            {/* RIGHT: EXTRACTED FORM FIELDS PREVIEW */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
              }}
            >
              <NibFieldsHeader />

              {/* SCROLLABLE FORM FIELDS */}
              <NibExtractedFields />
            </div>
          </div>

          {/* MODAL FOOTER */}
          <NibModalFooter />
        </div>
      </div>
    </NibOcrModalContext.Provider>
  );
}
