/** Drop area shown until a NIB file is chosen. */
import {Upload} from 'lucide-react';
import {useNibOcrModalContext} from '@/features/ocr/components/nib-modal/NibOcrModalContext';

export function UploadDropzone() {
  const {fileInputRef, isDragging, setIsDragging, handleDrop} = useNibOcrModalContext();
  return (
    <div
      onDragOver={e => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
      }}
      onDragEnter={e => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
      }}
      onDragLeave={e => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
      }}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      style={{
        border: isDragging ? '2px dashed #2563eb' : '2px dashed #94a3b8',
        borderRadius: 12,
        padding: '40px 24px',
        textAlign: 'center',
        background: isDragging ? '#eff6ff' : '#f8fafc',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.2s ease',
        flex: '1 1 0',
        minHeight: '380px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: isDragging ? '#dbeafe' : '#e0f2fe',
          color: '#2563eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.12)',
        }}
      >
        <Upload size={32} />
      </div>
      <div>
        <b style={{fontSize: '1.05rem', color: '#0f172a', display: 'block', marginBottom: 4}}>
          {isDragging ? 'Drop NIB Document Here' : 'Click or Drag NIB File Here'}
        </b>
        <span style={{fontSize: '0.84rem', color: '#64748b'}}>
          Supported formats: PDF, PNG, JPG, JPEG, or WEBP
        </span>
      </div>
      <button
        type="button"
        className="button primary small"
        onClick={e => {
          e.stopPropagation();
          fileInputRef.current?.click();
        }}
        style={{marginTop: 8}}
      >
        <Upload size={14} style={{marginRight: 6}} /> Browse File
      </button>
    </div>
  );
}
