/** Shown while the data was changed after the last OCR scan: new differences are only found by scanning again. */
import {AlertTriangle} from 'lucide-react';

export function RerunOcrNotice() {
  return (
    <div className="fap-r2-banner warn">
      <div className="fap-r2-banner-left">
        <AlertTriangle size={16} style={{flexShrink: 0}} />
        <span>
          <strong>Data was changed after the last OCR scan.</strong> Only the differences already found are
          re-checked. Run the OCR again (Re-analyze OCR) to detect new differences before approving.
        </span>
      </div>
    </div>
  );
}
