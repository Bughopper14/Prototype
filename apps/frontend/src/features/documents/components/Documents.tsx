import {DocumentsContext} from '@/features/documents/components/studio/DocumentsContext';
import {EvidenceRedesignView} from '@/features/documents/components/studio/evidence/EvidenceRedesignView';
import {FapRedesignView} from '@/features/documents/components/studio/fap/FapRedesignView';
import {PreAnalysisDocumentsView} from '@/features/documents/components/PreAnalysisDocumentsView';
import {UploadHistoryModal} from '@/features/documents/components/studio/UploadHistoryModal';
import {useDocumentsStudio, type DocumentsProps} from '@/features/documents/hooks/useDocumentsStudio';
import {SCREEN} from '@/shared/master-data';

export function Documents(props: DocumentsProps & {onOpenChecklist?: () => void}) {
  if (props.filterStage === SCREEN.PRE_ANALYSIS) {
    return (
      <PreAnalysisDocumentsView
        a={props.a}
        user={props.user}
        onChange={props.onChange}
        notify={props.notify}
        onOpenChecklist={props.onOpenChecklist}
      />
    );
  }
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

        {selectedCode === 'FAP' ? (
          <FapRedesignView onOpenChecklist={props.onOpenChecklist} />
        ) : (
          <EvidenceRedesignView onOpenChecklist={props.onOpenChecklist} />
        )}

        <UploadHistoryModal />
      </div>
    </DocumentsContext.Provider>
  );
}
