/** Header of the OCR card: status and the apply-all button. */
import {Sparkles} from 'lucide-react';
import {useStakeholderModalContext} from '@/features/legal/components/stakeholder-modal/StakeholderModalContext';

export function OcrResultsHeader() {
  const {editorLocked, docType, ocrLoading, currentAsset, applyDocOcrToForm} = useStakeholderModalContext();
  return (
    <div className="ktp-ocr-header">
      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
        <div className="ktp-ocr-badge-icon">
          <Sparkles size={14} />
        </div>
        <div>
          <h5 style={{margin: 0, fontSize: '13.5px', color: '#002060', fontWeight: 700}}>
            Hasil Pembacaan Dokumen ({docType} OCR)
          </h5>
          <div style={{display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px'}}>
            {ocrLoading ? (
              <span className="ktp-ocr-status loading">⏳ Scanning {docType} image...</span>
            ) : currentAsset.ocrText ? (
              <span className="ktp-ocr-status ready">✓ Data Ready to Sync</span>
            ) : (
              <span className="ktp-ocr-status empty">Awaiting file upload</span>
            )}
          </div>
        </div>
      </div>

      {currentAsset.ocrText && !editorLocked && (
        <button
          type="button"
          className="button primary small ktp-autofill-btn"
          onClick={applyDocOcrToForm}
          title={`Copy and sync ${docType} OCR data to the left form`}
        >
          <Sparkles size={13} /> Auto-fill to Left Form
        </button>
      )}
    </div>
  );
}
