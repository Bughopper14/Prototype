/** Cancel / save buttons. */
import {Save} from 'lucide-react';

import {useStakeholderModalContext} from '@/features/legal/components/stakeholder-modal/StakeholderModalContext';

export function StakeholderModalActions() {
  const {editorLocked, onClose, onSave} = useStakeholderModalContext();
  return (
    <div className="modal-actions">
      <button type="button" className="button" onClick={onClose}>
        {editorLocked ? 'Close' : 'Cancel'}
      </button>
      {!editorLocked && (
        <button
          type="button"
          className="button primary"
          onClick={onSave}
          style={{display: 'inline-flex', alignItems: 'center', gap: '6px'}}
        >
          <Save size={15} /> Save Shareholder
        </button>
      )}
    </div>
  );
}
