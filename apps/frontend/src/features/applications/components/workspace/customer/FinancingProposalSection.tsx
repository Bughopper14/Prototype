/** Customer section 08: facility proposed, terms & conditions, unit realization plan, notes and document requirements. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {DocumentRequirementsCard} from '@/features/applications/components/workspace/customer/proposal/DocumentRequirementsCard';
import {FacilityProposedCard} from '@/features/applications/components/workspace/customer/proposal/FacilityProposedCard';
import {ProposalNotesCard} from '@/features/applications/components/workspace/customer/proposal/ProposalNotesCard';
import {TermsAndConditionsCard} from '@/features/applications/components/workspace/customer/proposal/TermsAndConditionsCard';
import {UnitRealizationPlanCard} from '@/features/applications/components/workspace/customer/proposal/UnitRealizationPlanCard';
import {ChevronDown, Eye} from 'lucide-react';

export function FinancingProposalSection() {
  const {draft, setOpenSections, handleTriggerSync, toggleSection, openSections} = useWorkspace();
  return (
    <div
      className={`fap-accordion-card ${openSections['fap-preview-sec-proposal'] ? 'is-open' : 'is-closed'}`}
      id="acc-fap-preview-sec-proposal"
      data-section="proposal"
    >
      <div className="fap-accordion-header" onClick={() => toggleSection('fap-preview-sec-proposal')}>
        <div className="fap-acc-header-left">
          <span className="fap-acc-step-badge">08</span>
          <div className="fap-acc-titles">
            <div className="fap-acc-title-row">
              <h4 className="fap-acc-title">Financing Proposal</h4>
              <span className="fap-acc-badge">
                {draft.financingProposal?.facilityProposed?.units?.length || 0} Units
              </span>
            </div>
            <p className="fap-acc-subtitle">
              Facility proposed, terms & conditions, unit realization plan, and document requirements
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
              handleTriggerSync('fap-preview-sec-proposal');
              setOpenSections(s => ({...s, ['fap-preview-sec-proposal']: true}));
            }}
          >
            <Eye size={12} /> Sync View
          </button>
          <span className={`fap-acc-chevron ${openSections['fap-preview-sec-proposal'] ? 'rotate' : ''}`}>
            <ChevronDown size={17} />
          </span>
        </div>
      </div>
      {openSections['fap-preview-sec-proposal'] && (
        <div
          className="fap-accordion-content"
          style={{display: 'flex', flexDirection: 'column', gap: '20px'}}
        >
          <FacilityProposedCard />
          <TermsAndConditionsCard />
          <UnitRealizationPlanCard />
          <ProposalNotesCard />
          <DocumentRequirementsCard />
        </div>
      )}
    </div>
  );
}
