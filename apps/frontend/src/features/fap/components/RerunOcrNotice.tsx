/** Shown while the data was changed after the last OCR scan: new differences are only found by scanning again. */
import {AlertTriangle} from 'lucide-react';

export function RerunOcrNotice() {
  return (
    <div className="fap-diff-banner warning" style={{marginBottom: 12}}>
      <AlertTriangle size={18} style={{flexShrink: 0, marginTop: 1}} />
      <div>
        <strong>Data was changed after the last OCR scan.</strong> Only the differences already found are
        re-checked. Run the OCR again (Re-analyze OCR) to detect new differences before approving.
      </div>
    </div>
  );
}
