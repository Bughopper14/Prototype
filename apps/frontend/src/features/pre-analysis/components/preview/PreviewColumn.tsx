/** Right half of the screen: toolbar and the live document. */
import {PreviewToolbar} from '@/features/pre-analysis/components/preview/PreviewToolbar';
import {PreviewCanvas} from '@/features/pre-analysis/components/preview/PreviewCanvas';

export function PreviewColumn() {
  return (
    <div
      className="fap-detail-preview-col"
      style={{
        flex: '1 1 50%',
        width: '50%',
        minWidth: 0,
        height: '100%',
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        overflow: 'hidden',
      }}
    >
      {/* Ribbon Toolbar */}
      <PreviewToolbar />

      {/* Viewport Canvas */}
      <PreviewCanvas />
    </div>
  );
}
