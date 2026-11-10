/** Footer of the NIB preview: zoom level and remove. */
import {useNibOcrModalContext} from '@/features/ocr/components/nib-modal/NibOcrModalContext';

export function ViewerFooter() {
  const {fileInputRef, setFileUrl, setFileName, fileType, setFileType, zoom, setRawText, setFormData} =
    useNibOcrModalContext();
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 14px',
        background: '#1e293b',
        borderTop: '1px solid #334155',
        flexShrink: 0,
      }}
    >
      <span style={{fontSize: '0.75rem', color: '#94a3b8'}}>
        Previewing {fileType?.toUpperCase()} · Zoom: {Math.round(zoom * 100)}%
      </span>
      <button
        type="button"
        onClick={() => {
          // Removing the file clears what was read from it too
          setFileUrl(null);
          setFileName('');
          setFileType(null);
          setRawText('');
          setFormData({
            nib: '',
            companyName: '',
            alamat: '',
            email: '',
            phone: '',
            tanggalTerbit: '',
            city: '',
            district: '',
            village: '',
            postalCode: '',
            province: '',
            rt: '',
            rw: '',
          });
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
        style={{
          background: 'none',
          border: 'none',
          color: '#f87171',
          fontSize: '0.75rem',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        Remove Document
      </button>
    </div>
  );
}
