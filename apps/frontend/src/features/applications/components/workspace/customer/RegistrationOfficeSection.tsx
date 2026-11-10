/** Customer section 02: Registration Office & Domicile. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {Fields} from '@/shared/ui/Fields';
import {profileFields} from '@liugong/shared';
import {ChevronDown, Eye} from 'lucide-react';

export function RegistrationOfficeSection() {
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
      className={`fap-accordion-card ${openSections['fap-preview-sec-company'] ? 'is-open' : 'is-closed'}`}
      id="acc-fap-preview-sec-company"
    >
      <div className="fap-accordion-header" onClick={() => toggleSection('fap-preview-sec-company')}>
        <div className="fap-acc-header-left">
          <span className="fap-acc-step-badge">02</span>
          <div className="fap-acc-titles">
            <div className="fap-acc-title-row">
              <h4 className="fap-acc-title">Registration Office & Company Domicile</h4>
              <span className={`fap-acc-badge ${draft.city && draft.companyAddress ? 'success' : ''}`}>
                {draft.city ? `${draft.city} (${draft.branchCode || 'Branch'})` : 'Not filled'}
              </span>
            </div>
            <p className="fap-acc-subtitle">
              Application branch, domicile ownership, full address, and official contact
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
              handleTriggerSync('fap-preview-sec-company');
              setOpenSections(s => ({...s, ['fap-preview-sec-company']: true}));
            }}
          >
            <Eye size={12} /> Sync View
          </button>
          <span className={`fap-acc-chevron ${openSections['fap-preview-sec-company'] ? 'rotate' : ''}`}>
            <ChevronDown size={17} />
          </span>
        </div>
      </div>
      {openSections['fap-preview-sec-company'] && (
        <div className="fap-accordion-content">
          <div style={{marginBottom: 14}}>
            <h5 style={{margin: '0 0 6px 0', fontSize: '0.82rem', color: '#1e293b', fontWeight: 700}}>
              Office & Branch Status
            </h5>
            <Fields
              fields={profileFields.filter(f => ['branchCode', 'locationStatus'].includes(f.key))}
              value={draft}
              disabled={!canEditCustomerPic}
              section="company"
              onFieldFocus={k => handleTriggerFieldSync(k, 'company')}
              onFieldSync={k => handleTriggerFieldSync(k, 'company')}
              activeFieldKey={activeFieldKey}
              onChange={setDraft}
            />
          </div>
          <div style={{borderTop: '1px dashed #e2e8f0', paddingTop: 14}}>
            <h5 style={{margin: '0 0 6px 0', fontSize: '0.82rem', color: '#1e293b', fontWeight: 700}}>
              Office Address & Official Contact
            </h5>
            <Fields
              fields={profileFields.filter(f =>
                [
                  'companyAddress',
                  'province',
                  'city',
                  'district',
                  'village',
                  'rt',
                  'rw',
                  'postalCode',
                  'phoneFax',
                  'email',
                  'website',
                ].includes(f.key),
              )}
              value={draft}
              disabled={!canEditCustomerPic}
              section="company"
              onFieldFocus={k => handleTriggerFieldSync(k, 'company')}
              onFieldSync={k => handleTriggerFieldSync(k, 'company')}
              activeFieldKey={activeFieldKey}
              onChange={setDraft}
            />
          </div>
        </div>
      )}
    </div>
  );
}
