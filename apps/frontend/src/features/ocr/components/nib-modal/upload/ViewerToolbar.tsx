/** Toolbar above the NIB preview: file name, zoom, rotate and replace. */
import {FileText, Maximize2, RefreshCw, RotateCw, ZoomIn, ZoomOut} from 'lucide-react';
import {useNibOcrModalContext} from '@/features/ocr/components/nib-modal/NibOcrModalContext';

export function ViewerToolbar() {
  const {fileInputRef, fileName, zoom, setZoom, setRotation} = useNibOcrModalContext();
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 14px',
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        flexShrink: 0,
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 8, maxWidth: '50%'}}>
        <FileText size={16} color="#60a5fa" />
        <span
          style={{
            fontSize: '0.8rem',
            color: '#f8fafc',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {fileName || 'NIB Document'}
        </span>
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
        <button
          type="button"
          onClick={() => setZoom(z => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
          title="Zoom Out"
          style={{
            background: '#334155',
            border: 'none',
            color: '#f8fafc',
            padding: '5px 9px',
            borderRadius: 5,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ZoomOut size={14} />
        </button>
        <span
          style={{
            fontSize: '0.8rem',
            color: '#94a3b8',
            minWidth: 44,
            textAlign: 'center',
            fontWeight: 600,
          }}
        >
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom(z => Math.min(3, Number((z + 0.15).toFixed(2))))}
          title="Zoom In"
          style={{
            background: '#334155',
            border: 'none',
            color: '#f8fafc',
            padding: '5px 9px',
            borderRadius: 5,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ZoomIn size={14} />
        </button>
        <button
          type="button"
          onClick={() => setRotation(r => (r + 90) % 360)}
          title="Rotate 90°"
          style={{
            background: '#334155',
            border: 'none',
            color: '#f8fafc',
            padding: '5px 9px',
            borderRadius: 5,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <RotateCw size={14} />
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setRotation(0);
          }}
          title="Reset Zoom"
          style={{
            background: '#334155',
            border: 'none',
            color: '#f8fafc',
            padding: '5px 9px',
            borderRadius: 5,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Maximize2 size={14} />
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Replace Document"
          style={{
            background: '#2563eb',
            border: 'none',
            color: '#ffffff',
            padding: '5px 10px',
            borderRadius: 5,
            cursor: 'pointer',
            fontSize: '0.74rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <RefreshCw size={12} /> Replace
        </button>
      </div>
    </div>
  );
}
