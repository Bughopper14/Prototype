/** Upload area shown while no QA document is attached. */
import {Upload} from 'lucide-react';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function QaUploadDropzone() {
  const {setData, scrollToPreviewElement} = usePreAnalysisContext();
  return (
    <label
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 12px',
        border: '1.5px dashed #94a3b8',
        borderRadius: '6px',
        background: '#f8fafc',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
      onDragOver={e => {
        e.preventDefault();
      }}
      onDrop={e => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = uploadEvt => {
            const base64 = uploadEvt.target?.result as string;
            setData(prev => ({
              ...prev,
              qaDocumentName: file.name,
              qaIlinkComment: file.name,
              qaDocumentFile: base64,
            }));
            scrollToPreviewElement('preana-preview-cell-qaIlinkComment');
          };
          reader.readAsDataURL(file);
        }
      }}
    >
      <Upload size={22} style={{color: '#0284c7', marginBottom: '6px'}} />
      <span style={{fontSize: '0.78rem', fontWeight: 600, color: '#0f294a', marginBottom: '2px'}}>
        Click or drag QA document here to upload
      </span>
      <span style={{fontSize: '0.68rem', color: '#64748b'}}>
        Supports PDF, Word (.doc, .docx), Excel (.xls, .xlsx), or Images
      </span>
      <input
        type="file"
        id="input-upload-qa-doc"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
        style={{display: 'none'}}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = uploadEvt => {
              const base64 = uploadEvt.target?.result as string;
              setData(prev => ({
                ...prev,
                qaDocumentName: file.name,
                qaIlinkComment: file.name,
                qaDocumentFile: base64,
              }));
              scrollToPreviewElement('preana-preview-cell-qaIlinkComment');
            };
            reader.readAsDataURL(file);
          }
        }}
      />
    </label>
  );
}
