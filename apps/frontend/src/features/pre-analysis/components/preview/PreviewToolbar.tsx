/** Toolbar above the document: identity, view tabs, zoom and print. */
import {PreviewDocumentIdentity} from '@/features/pre-analysis/components/preview/PreviewDocumentIdentity';
import {ViewModeTabs} from '@/features/pre-analysis/components/preview/ViewModeTabs';
import {ZoomControls} from '@/features/pre-analysis/components/preview/ZoomControls';
import {PrintButton} from '@/features/pre-analysis/components/preview/PrintButton';

export function PreviewToolbar() {
  return (
    <div
      className="pre-analysis-ribbon-toolbar"
      style={{
        height: '44px',
        minHeight: '44px',
        background: '#0f294a',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        borderRadius: '7px 7px 0 0',
        fontSize: '0.8rem',
        fontWeight: 600,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        boxSizing: 'border-box',
        gap: '10px',
      }}
    >
      <PreviewDocumentIdentity />

      {/* Right: Controls (Tabs, Zoom, Print) */}
      <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0}}>
        <ViewModeTabs />

        <ZoomControls />

        <PrintButton />
      </div>
    </div>
  );
}
