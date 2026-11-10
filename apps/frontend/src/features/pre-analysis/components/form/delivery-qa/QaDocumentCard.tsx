/** The attached QA document, with rename and remove. */
import {FileText, CheckCircle2, Upload, Trash2} from 'lucide-react';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function QaDocumentCard() {
  const {data, setData, scrollToPreviewElement} = usePreAnalysisContext();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        background: '#f8fafc',
        border: '1px solid #bfdbfe',
        borderRadius: '6px',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          minWidth: 0,
          flex: '1 1 240px',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            background: '#eff6ff',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: '1px solid #dbeafe',
          }}
        >
          <FileText size={20} />
        </div>
        <div style={{minWidth: 0, flex: 1}}>
          <input
            type="text"
            value={data.qaDocumentName || data.qaIlinkComment || ''}
            onChange={e => {
              const val = e.target.value;
              setData(prev => ({
                ...prev,
                qaDocumentName: val,
                qaIlinkComment: val,
              }));
            }}
            onFocus={() => scrollToPreviewElement('preana-preview-cell-qaIlinkComment')}
            style={{
              width: '100%',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              padding: '3px 6px',
              background: '#ffffff',
            }}
            title="Edit document name"
          />
          <div
            style={{
              fontSize: '0.68rem',
              color: '#16a34a',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '3px',
            }}
          >
            <CheckCircle2 size={12} /> Document attached
          </div>
        </div>
      </div>

      <div style={{display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0}}>
        <label
          style={{
            fontSize: '0.72rem',
            fontWeight: 600,
            padding: '5px 12px',
            borderRadius: '4px',
            background: '#eff6ff',
            color: '#1e40af',
            border: '1px solid #bfdbfe',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <Upload size={13} />
          <span>Change File</span>
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
        <button
          type="button"
          id="btn-remove-qa-doc"
          onClick={() => {
            setData(prev => ({
              ...prev,
              qaDocumentName: '',
              qaIlinkComment: '',
              qaDocumentFile: '',
            }));
            scrollToPreviewElement('preana-preview-cell-qaIlinkComment');
          }}
          style={{
            fontSize: '0.72rem',
            fontWeight: 600,
            padding: '5px 10px',
            borderRadius: '4px',
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
          title="Remove attached document"
        >
          <Trash2 size={12} />
          <span>Remove</span>
        </button>
      </div>
    </div>
  );
}
