import {DocumentsContext} from '@/features/documents/components/studio/DocumentsContext';
import {StageSidebar} from '@/features/documents/components/studio/evidence/StageSidebar';
import {ViewerCanvas} from '@/features/documents/components/studio/evidence/ViewerCanvas';
import {ViewerHead} from '@/features/documents/components/studio/evidence/ViewerHead';
import {ViewerToolbar} from '@/features/documents/components/studio/evidence/ViewerToolbar';
import {FapDiffPanel} from '@/features/documents/components/studio/fap/FapDiffPanel';
import {FapSectionNav} from '@/features/documents/components/studio/fap/FapSectionNav';
import {FapUploadBanner} from '@/features/documents/components/studio/fap/FapUploadBanner';
import {OcrDocumentPane} from '@/features/documents/components/studio/fap/OcrDocumentPane';
import {SystemDocumentPane} from '@/features/documents/components/studio/fap/SystemDocumentPane';
import {StudioHeader} from '@/features/documents/components/studio/StudioHeader';
import {UploadHistoryModal} from '@/features/documents/components/studio/UploadHistoryModal';
import {useDocumentsStudio, type DocumentsProps} from '@/features/documents/hooks/useDocumentsStudio';

export function Documents(props: DocumentsProps) {
  const state = useDocumentsStudio(props);
  const {selectedCode, error, sidebarCollapsed, isMaximized, fapComparisonContainerRef} = state;
  return (
    <DocumentsContext.Provider value={state}>
      <div className="evidence-studio-container">
        {/* Studio Header & Stage Pill Navigation */}
        <StudioHeader />

        {error && (
          <div className="error" role="alert" style={{marginBottom: '14px'}}>
            {error}
          </div>
        )}

        {/* When FAP is selected: Full-Width Top Uploader + 50/50 Split Preview + Bottom Diff Panel */}
        {selectedCode === 'FAP' ? (
          <div className="fap-studio-fap-view">
            {/* Top Section: Full-Width Upload Banner with History Pop-up Button */}
            <FapUploadBanner />

            {/* Unified Section Navigation Bar */}
            <FapSectionNav />

            {/* 50 / 50 Comparison Split Grid */}
            <div className="fap-comparison-grid-5050" ref={fapComparisonContainerRef}>
              {/* Left Pane (50%): Dokumen Terakhir yang di-generate oleh sistem */}
              <SystemDocumentPane />

              {/* Right Pane (50%): Dokumen Hasil OCR (Fisik Terunggah) */}
              <OcrDocumentPane />
            </div>

            {/* Bottom Section: Differences Comparison Panel - only rendered when comparator file and comparison exist */}
            <FapDiffPanel />
          </div>
        ) : (
          /* Non-FAP Stages: Standard Studio Layout */
          <div className={`evidence-studio-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            {/* Left Column: Stage Inspector & File Deck */}
            <StageSidebar />

            {/* Right Column: Studio Document Previewer */}
            <section className={`panel document-viewer-studio ${isMaximized ? 'maximized' : ''}`}>
              {/* Studio Top Context Bar */}
              <ViewerHead />

              {/* Translucent Glass Toolbar */}
              <ViewerToolbar />

              {/* Viewport Canvas */}
              <ViewerCanvas />
            </section>
          </div>
        )}

        {/* Pop-up Modal: Upload History */}
        <UploadHistoryModal />
      </div>
    </DocumentsContext.Provider>
  );
}
