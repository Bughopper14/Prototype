/** QA document of the iLink / GPS performance check (upload only). */
import {FileText} from 'lucide-react';
import {QaDocumentCard} from '@/features/pre-analysis/components/form/delivery-qa/QaDocumentCard';
import {QaUploadDropzone} from '@/features/pre-analysis/components/form/delivery-qa/QaUploadDropzone';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function QaIlinkCommentField() {
  const {data} = usePreAnalysisContext();
  return (
    <>
      {/* QA Comment — iLink/GPS Performance Check (Document Upload Only) */}
      <div
        id="preana-form-qaIlinkComment"
        data-field="qaIlinkComment"
        tabIndex={-1}
        style={{
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '12px',
          background: '#ffffff',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
            flexWrap: 'wrap',
            gap: '6px',
          }}
        >
          <div>
            <label
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#1e3a8a',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                margin: 0,
              }}
            >
              <FileText size={15} color="#2563eb" />
              <span>QA Comment — iLink/GPS Performance Check</span>
            </label>
            <div style={{fontSize: '0.68rem', color: '#64748b', marginTop: '2px'}}>
              Upload official QA / iLink GPS performance check document (PDF, Word, Excel, Image)
            </div>
          </div>
        </div>

        {data.qaDocumentName || data.qaIlinkComment ? <QaDocumentCard /> : <QaUploadDropzone />}
      </div>
    </>
  );
}
