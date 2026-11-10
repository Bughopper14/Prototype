/** The NIB image or PDF, with zoom and rotation. */
import {useNibOcrModalContext} from '@/features/ocr/components/nib-modal/NibOcrModalContext';

export function ViewerCanvas() {
  const {fileUrl, fileType, zoom, rotation} = useNibOcrModalContext();
  return (
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
            src={fileUrl ?? undefined}
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
  );
}
