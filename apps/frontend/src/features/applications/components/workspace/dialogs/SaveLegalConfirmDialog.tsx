/** Confirm saving deed + stakeholder changes. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {Modal} from '@/shared/ui/Modal';
import {Save} from 'lucide-react';

export function SaveLegalConfirmDialog() {
  const {saveConfirm, setSaveConfirm, save} = useWorkspace();
  return (
    <>
      {saveConfirm && (
        <Modal title="Save Legal changes" onClose={() => setSaveConfirm(false)}>
          <div className="modal-body">
            <p>Save deed changes and Stakeholders on this application?</p>
          </div>
          <div className="modal-actions">
            <button className="button" onClick={() => setSaveConfirm(false)}>
              Cancel
            </button>
            <button
              className="button primary"
              onClick={() => {
                setSaveConfirm(false);
                save();
              }}
            >
              <Save size={15} />
              Save changes
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
