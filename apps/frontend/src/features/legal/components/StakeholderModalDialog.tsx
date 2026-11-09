import {Modal} from '@/shared/ui/Modal';

import {DocTypeTabs} from '@/features/legal/components/stakeholder-modal/DocTypeTabs';
import {DocumentPaneToolbar} from '@/features/legal/components/stakeholder-modal/DocumentPaneToolbar';
import {DocumentViewer} from '@/features/legal/components/stakeholder-modal/DocumentViewer';
import {FormHeaderBar} from '@/features/legal/components/stakeholder-modal/FormHeaderBar';
import {OcrResultsWorkspace} from '@/features/legal/components/stakeholder-modal/OcrResultsWorkspace';
import {StakeholderFields} from '@/features/legal/components/stakeholder-modal/StakeholderFields';
import {StakeholderModalActions} from '@/features/legal/components/stakeholder-modal/StakeholderModalActions';
import {StakeholderModalContext} from '@/features/legal/components/stakeholder-modal/StakeholderModalContext';
import {
  useStakeholderModal,
  type StakeholderModalDialogProps,
} from '@/features/legal/hooks/useStakeholderModal';

export function StakeholderModalDialog(props: StakeholderModalDialogProps) {
  const state = useStakeholderModal(props);
  const {editorLocked, formError, onClose, isNewStakeholder, isRightPaneVisible} = state;
  return (
    <StakeholderModalContext.Provider value={state}>
      <Modal
        title={
          !isRightPaneVisible
            ? isNewStakeholder
              ? 'Add Stakeholder'
              : editorLocked
                ? 'Stakeholder Details'
                : 'Edit Stakeholder'
            : isNewStakeholder
              ? 'Add Stakeholder · Identity Document & OCR'
              : editorLocked
                ? 'Stakeholder Details'
                : 'Edit Stakeholder · Identity Document & OCR'
        }
        onClose={onClose}
        className={
          isRightPaneVisible ? 'modal-side-by-side modal-stakeholder-ktp' : 'modal-stakeholder-form-only'
        }
      >
        <div className="modal-side-by-side-body">
          {/* LEFT PANE: FORM FIELDS */}
          <div className="modal-side-form-pane">
            <FormHeaderBar />

            {formError && (
              <div className="error" role="alert">
                {formError}
              </div>
            )}
            <StakeholderFields />
          </div>

          {/* RIGHT PANE: DOCUMENT PREVIEW & OCR WORKSPACE (Visible only when document is present or ID type selected) */}
          {isRightPaneVisible && (
            <div className="modal-side-preview-pane stakeholder-ktp-pane">
              {/* DOCUMENT TYPE SELECTOR TABS */}
              <DocTypeTabs />

              {/* TOP TOOLBAR */}
              <DocumentPaneToolbar />

              {/* DOCUMENT VIEWER CARD */}
              <DocumentViewer />

              {/* OCR RESULTS WORKSPACE */}
              <OcrResultsWorkspace />
            </div>
          )}
        </div>

        <StakeholderModalActions />
      </Modal>
    </StakeholderModalContext.Provider>
  );
}
