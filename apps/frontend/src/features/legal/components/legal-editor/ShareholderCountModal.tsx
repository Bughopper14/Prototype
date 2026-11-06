/** Shareholder count of a deed. */
import {ShareholderCountContent} from '@/features/legal/components/DeedViews';
import {Modal} from '@/shared/ui/Modal';

import {useLegalEditorContext} from '@/features/legal/components/legal-editor/LegalEditorContext';

export function ShareholderCountModal() {
  const {shareholderCountDeed, setShareholderCountDeed, deeds, rowsFor} = useLegalEditorContext();
  return (
    <>
      {shareholderCountDeed && (
        <Modal title="Shareholder Count" onClose={() => setShareholderCountDeed(null)}>
          <ShareholderCountContent rows={rowsFor(deeds.find(x => x.id === shareholderCountDeed))} />
          <div className="modal-actions">
            <button className="button primary" onClick={() => setShareholderCountDeed(null)}>
              Close
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
