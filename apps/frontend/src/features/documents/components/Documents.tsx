import {DocumentsContext} from '@/features/documents/components/studio/DocumentsContext';
import {EvidenceRedesignView} from '@/features/documents/components/studio/evidence/EvidenceRedesignView';
import {FapRedesignView} from '@/features/documents/components/studio/fap/FapRedesignView';
import {UploadHistoryModal} from '@/features/documents/components/studio/UploadHistoryModal';
import {useDocumentsStudio, type DocumentsProps} from '@/features/documents/hooks/useDocumentsStudio';

export function Documents(props: DocumentsProps) {
  const state = useDocumentsStudio(props);
  const {selectedCode, error} = state;
  return (
    <DocumentsContext.Provider value={state}>
      <div className="evidence-studio-container">
        {error && (
          <div className="error" role="alert" style={{marginBottom: '14px'}}>
            {error}
          </div>
        )}

        {/* FAP Documents tab: Redesign 2 (with OCR Data Comparison, Focus view, Side by side) */}
        {/* Non-FAP Stages (Pre-analysis, ICLF): Unified Redesign 2 upload & preview without OCR */}
        {selectedCode === 'FAP' ? (
          <FapRedesignView onOpenChecklist={props.onOpenChecklist} />
        ) : (
          <EvidenceRedesignView onOpenChecklist={props.onOpenChecklist} />
        )}

        {/* Pop-up Modal: Upload History */}
        <UploadHistoryModal />
      </div>
    </DocumentsContext.Provider>
  );
}
