/** Confirm deleting a stakeholder from a deed. */
import {Modal} from '@/shared/ui/Modal';
import {Trash2} from 'lucide-react';

import {useLegalEditorContext} from '@/features/legal/components/legal-editor/LegalEditorContext';

export function DeleteStakeholderModal() {
  const {deleteStakeholder, setDeleteStakeholder, setStakeholderList, deeds, rowsFor, updateRows} =
    useLegalEditorContext();
  return (
    <>
      {deleteStakeholder && (
        <Modal title="Delete Stakeholder" onClose={() => setDeleteStakeholder(null)}>
          <div className="modal-body">
            <p>
              Are you sure you want to delete stakeholder <strong>{deleteStakeholder.name}</strong> from this
              deed?
            </p>
            <p className="muted legal-delete-note">This will remove this stakeholder only from this deed.</p>
          </div>
          <div className="modal-actions">
            <button className="button" onClick={() => setDeleteStakeholder(null)}>
              Cancel
            </button>
            <button
              className="button legal-confirm-delete"
              onClick={async () => {
                const {deedId, id, index} = deleteStakeholder;
                const x = deeds.find(d => d.id === deedId);
                if (x)
                  // Match by id when the row has one, so a re-ordered list never removes the wrong person
                  await updateRows(
                    x.id,
                    rowsFor(x).filter((item: any, i: number) =>
                      id && item.id ? item.id !== id : i !== index,
                    ),
                  );
                setStakeholderList(deedId);
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
