/** Customer section 04: Primary Contact / PIC. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {Fields} from '@/shared/ui/Fields';
import {picFields} from '@liugong/shared';
import {ChevronDown, Eye} from 'lucide-react';

export function PrimaryContactSection() {
  const {
    draft,
    setDraft,
    openSections,
    setOpenSections,
    activeFieldKey,
    handleTriggerFieldSync,
    handleTriggerSync,
    toggleSection,
    canEditCustomerPic,
  } = useWorkspace();
  return (
    <div
      className={`fap-accordion-card ${openSections['fap-preview-sec-pic'] ? 'is-open' : 'is-closed'}`}
      id="acc-fap-preview-sec-pic"
    >
      <div className="fap-accordion-header" onClick={() => toggleSection('fap-preview-sec-pic')}>
        <div className="fap-acc-header-left">
          <span className="fap-acc-step-badge">04</span>
          <div className="fap-acc-titles">
            <div className="fap-acc-title-row">
              <h4 className="fap-acc-title">Primary Contact / Person in Charge (PIC)</h4>
              <span className={`fap-acc-badge ${draft.pic?.picName ? 'success' : ''}`}>
                {draft.pic?.picName ? `${draft.pic.picName} (${draft.pic.position || 'PIC'})` : 'Not filled'}
              </span>
            </div>
            <p className="fap-acc-subtitle">
              PIC personal data, position/title, mobile number, and PIC domicile address
            </p>
          </div>
        </div>
        <div className="fap-acc-header-right">
          <button
            type="button"
            className="fap-acc-sync-btn"
            title="Sync preview document to this section"
            onClick={e => {
              e.stopPropagation();
              handleTriggerSync('fap-preview-sec-pic');
              setOpenSections(s => ({...s, ['fap-preview-sec-pic']: true}));
            }}
          >
            <Eye size={12} /> Sync View
          </button>
          <span className={`fap-acc-chevron ${openSections['fap-preview-sec-pic'] ? 'rotate' : ''}`}>
            <ChevronDown size={17} />
          </span>
        </div>
      </div>
      {openSections['fap-preview-sec-pic'] && (
        <div className="fap-accordion-content">
          <Fields
            fields={picFields}
            value={draft.pic || {}}
            disabled={!canEditCustomerPic}
            section="pic"
            onFieldFocus={k => handleTriggerFieldSync(k, 'pic')}
            onFieldSync={k => handleTriggerFieldSync(k, 'pic')}
            activeFieldKey={activeFieldKey}
            onChange={pic => setDraft({...draft, pic})}
          />
        </div>
      )}
    </div>
  );
}
