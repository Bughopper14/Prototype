/** Left half: NIB document upload and viewer. */
import {FileText, Maximize2, RefreshCw, RotateCw, Upload, ZoomIn, ZoomOut} from 'lucide-react';

import {useNibOcrModalContext} from '@/features/ocr/components/nib-modal/NibOcrModalContext';

export function NibUploadZone() {
  const {
    fileInputRef,
    fileUrl,
    setFileUrl,
    fileName,
    setFileName,
    fileType,
    setFileType,
    zoom,
    setZoom,
    rotation,
    setRotation,
    isDragging,
    setIsDragging,
    handleFileUpload,
    handleDrop,
  } = useNibOcrModalContext();
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        height: '100%',
        minHeight: 0,
        minWidth: 0,
      }}
    >
      {fileUrl ? (
        <div
          style={{
            background: '#0f172a',
            border: '1px solid #cbd5e1',
            borderRadius: 10,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            flex: '1 1 0',
            minHeight: 0,
          }}
        >
          {/* TOOLBAR */}
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

          {/* PREVIEW CANVAS */}
          <div
            style={{
              flex: '1 1 0',
              minHeight: 0,
              height: '100%',
              overflow: fileType === 'pdf' ? 'hidden' : 'auto',
              display: 'flex',
              alignItems: 'stretch',
              justifyContent: 'stretch',
              background: '#090d16',
              padding: 0,
              position: 'relative',
            }}
          >
            {fileType === 'pdf' ? (
              <iframe
                key={`${fileUrl}-${Math.round(zoom * 100)}`}
                src={`${fileUrl}#toolbar=0&navpanes=0&zoom=${Math.round(zoom * 100)}`}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  background: '#ffffff',
                  minHeight: '100%',
                  display: 'block',
                }}
                title="NIB PDF Preview"
              />
            ) : (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '100%',
                  minHeight: '100%',
                  margin: 'auto',
                }}
              >
                <img
                  src={fileUrl}
                  alt="NIB Preview"
                  style={{
                    maxWidth: zoom <= 1 ? '100%' : 'none',
                    maxHeight: zoom <= 1 ? '100%' : 'none',
                    width: zoom > 1 ? `${Math.round(zoom * 100)}%` : 'auto',
                    objectFit: 'contain',
                    transform: `rotate(${rotation}deg)`,
                    transition: 'width 0.15s ease, transform 0.15s ease',
                  }}
                />
              </div>
            )}
          </div>

          {/* BOTTOM ACTION */}
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
                setFileUrl(null);
                setFileName('');
                setFileType(null);
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
        </div>
      ) : (
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
      )}

      {/* HIDDEN INPUT FOR FILE SELECTION */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileUpload}
        style={{display: 'none'}}
      />
    </div>
  );
}
