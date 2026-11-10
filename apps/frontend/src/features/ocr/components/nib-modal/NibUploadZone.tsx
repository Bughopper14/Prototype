/** Left half: NIB document upload and viewer. */
import {UploadDropzone} from '@/features/ocr/components/nib-modal/upload/UploadDropzone';
import {ViewerFooter} from '@/features/ocr/components/nib-modal/upload/ViewerFooter';
import {ViewerCanvas} from '@/features/ocr/components/nib-modal/upload/ViewerCanvas';
import {ViewerToolbar} from '@/features/ocr/components/nib-modal/upload/ViewerToolbar';

import {useNibOcrModalContext} from '@/features/ocr/components/nib-modal/NibOcrModalContext';

export function NibUploadZone() {
  const {fileInputRef, fileUrl, handleFileUpload} = useNibOcrModalContext();
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
          <ViewerToolbar />

          {/* PREVIEW CANVAS */}
          <ViewerCanvas />

          {/* BOTTOM ACTION */}
          <ViewerFooter />
        </div>
      ) : (
        <UploadDropzone />
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
