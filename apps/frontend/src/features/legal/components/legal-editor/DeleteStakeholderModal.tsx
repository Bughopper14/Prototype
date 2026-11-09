/** Confirm deleting a stakeholder from a deed. */
import {Modal} from '@/shared/ui/Modal';
import {Trash2} from 'lucide-react';

import {useLegalEditorContext} from '@/features/legal/components/legal-editor/LegalEditorContext';

export function DeleteStakeholderModal() {
  const {deleteStakeholder, setDeleteStakeholder, deeds, rowsFor, updateRows} = useLegalEditorContext();
  return (
    <>
      {deleteStakeholder && (
        <Modal title="Delete Stakeholder" onClose={() => setDeleteStakeholder(null)}>
          <div className="modal-body">
            <p>Delete this stakeholder from the deed?</p>
            <p className="muted legal-delete-note">Click Save changes in Legal to keep changes saved.</p>
          </div>
          <div className="modal-actions">
            <button className="button" onClick={() => setDeleteStakeholder(null)}>
              Cancel
            </button>
            <button
              className="button legal-confirm-delete"
              onClick={() => {
                const x = deeds.find(d => d.id === deleteStakeholder.deedId);
                if (x)
                  updateRows(
                    x.id,
                    rowsFor(x).filter((_, i) => i !== deleteStakeholder.index),
                  );
                setDeleteStakeholder(null);
              }}
            >
              <Trash2 size={15} />
              Delete stakeholder
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
