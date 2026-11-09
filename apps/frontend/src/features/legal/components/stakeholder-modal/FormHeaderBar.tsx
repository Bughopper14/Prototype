/** Stakeholder form header: title and apply-all-OCR button. */

import {useStakeholderModalContext} from '@/features/legal/components/stakeholder-modal/StakeholderModalContext';

export function FormHeaderBar() {
  const {copiedKey} = useStakeholderModalContext();
  return (
    <div className="ktp-form-header-bar">
      <div>
        <span className="eyebrow" style={{color: '#002060', fontWeight: 700, letterSpacing: '0.5px'}}>
          STAKEHOLDER FORM
        </span>
        <h3 style={{margin: '2px 0 0 0', fontSize: '15px', color: '#0f172a'}}>
          Shareholders & Directors Data
        </h3>
      </div>
      {copiedKey === 'applied_all' && (
        <span
          className="subtle-chip"
          style={{
            background: '#eff6ff',
            color: '#1d4ed8',
            border: '1px solid #bfdbfe',
            fontWeight: 600,
            fontSize: '11px',
          }}
        >
          ✓ Document Data Applied to Form!
        </span>
      )}
    </div>
  );
}
