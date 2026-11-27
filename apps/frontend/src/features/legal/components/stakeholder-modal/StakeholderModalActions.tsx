/** Cancel / save buttons. */
import {AlertTriangle, Save} from 'lucide-react';

import {useStakeholderModalContext} from '@/features/legal/components/stakeholder-modal/StakeholderModalContext';

export function StakeholderModalActions() {
  const {editorLocked, formError, onClose, onSave} = useStakeholderModalContext();
  return (
    <div className="modal-actions">
      {/* the reason a save was refused is shown here, beside the button, because the form above is long and scrolls */}
      {formError && (
        <span role="alert" style={{marginRight: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, color: '#b91c1c', fontSize: 13, fontWeight: 700, minWidth: 0}}>
          <AlertTriangle size={15} style={{flexShrink: 0}} />
          {formError}
        </span>
      )}
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
          <Save size={15} /> Save Stakeholder
        </button>
      )}
    </div>
  );
}
