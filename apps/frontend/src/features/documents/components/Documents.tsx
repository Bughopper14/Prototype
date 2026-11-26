import {DocumentsContext} from '@/features/documents/components/studio/DocumentsContext';
import {StageSidebar} from '@/features/documents/components/studio/evidence/StageSidebar';
import {ViewerCanvas} from '@/features/documents/components/studio/evidence/ViewerCanvas';
import {ViewerHead} from '@/features/documents/components/studio/evidence/ViewerHead';
import {ViewerToolbar} from '@/features/documents/components/studio/evidence/ViewerToolbar';
import {FapRedesignView} from '@/features/documents/components/studio/fap/FapRedesignView';
import {StudioHeader} from '@/features/documents/components/studio/StudioHeader';
import {UploadHistoryModal} from '@/features/documents/components/studio/UploadHistoryModal';
import {useDocumentsStudio, type DocumentsProps} from '@/features/documents/hooks/useDocumentsStudio';

export function Documents(props: DocumentsProps) {
  const state = useDocumentsStudio(props);
  const {selectedCode, error, sidebarCollapsed, isMaximized} = state;
  return (
    <DocumentsContext.Provider value={state}>
      <div className="evidence-studio-container">
        {/* Keep the legacy studio header only for non-FAP evidence stages */}
        {selectedCode !== 'FAP' && <StudioHeader />}

        {error && (
          <div className="error" role="alert" style={{marginBottom: '14px'}}>
            {error}
          </div>
        )}

        {/* FAP Documents tab: Redesign 2 (empty upload, Data comparison, Focus view, Side by side) */}
        {selectedCode === 'FAP' ? (
          <FapRedesignView onOpenChecklist={props.onOpenChecklist} />
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
