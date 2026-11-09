/** Dialog to edit one mandatory-field rule. */
import {resolveRuleSection} from '@/shared/master-data';
import {Save, X} from 'lucide-react';
import {useState} from 'react';
import {createPortal} from 'react-dom';
import {isPreStage} from '../../lib/mandatory-rules';

export function EditMandatoryDialog({
  item,
  onClose,
  onSaved,
}: {
  item: any;
  onClose: () => void;
  onSaved: (status: number) => void;
}) {
  const [val, setVal] = useState<number>(item.mandatory ? 1 : 0);
  const isPre = isPreStage(item.stage);
  return createPortal(
    <div className="modal-scrim master-modal-scrim">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Edit Mandatory · ${item.field_label}`}
      >
        <div className="modal-head">
          <h2>Edit Mandatory Rule · {item.field_label}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <div className="formgrid">
            <label>
              Application Stage
              <input disabled value={isPre ? 'PRE-AN' : 'FAP'} />
            </label>
            <label>
              Section
              <input disabled value={resolveRuleSection(item)} />
            </label>
            <label>
              Field Label
              <input disabled value={item.field_label} />
            </label>
            <label>
              Field Key
              <input disabled value={item.field_key} />
            </label>
            <label>
              Mandatory Status in Database
              <select value={val} onChange={e => setVal(Number(e.target.value))}>
                <option value={0}>0 — Optional (Not required)</option>
                <option value={1}>1 — Mandatory (Required, red asterisk *)</option>
              </select>
            </label>
          </div>
          <p className="master-help">
            If set to <b>Mandatory (1)</b>, the system validates this column before application submission,
            and automatically displays a red asterisk (*) on form labels.
          </p>
        </div>
        <div className="modal-actions">
          <button className="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" onClick={() => onSaved(val)}>
            <Save size={15} /> Save Changes
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
