/** Customer section 09: financial statements (max. three fiscal years, figures in IDR). */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {FinancialStatementsCarousel} from '@/features/applications/components/workspace/customer/FinancialStatementsCarousel';
import {ChevronDown, Eye} from 'lucide-react';

export function FinancialStatementsSection() {
  const {draft, openSections, setOpenSections, handleTriggerSync, toggleSection} = useWorkspace();
  return (
    <div
      className={`fap-accordion-card ${openSections['fap-preview-sec-financial'] ? 'is-open' : 'is-closed'}`}
      id="acc-fap-preview-sec-financial"
      data-section="financial"
    >
      <div className="fap-accordion-header" onClick={() => toggleSection('fap-preview-sec-financial')}>
        <div className="fap-acc-header-left">
          <span className="fap-acc-step-badge">09</span>
          <div className="fap-acc-titles">
            <div className="fap-acc-title-row">
              <h4 className="fap-acc-title">Financial Statements</h4>
              <span
                className={`fap-acc-badge ${(draft.financialStatements?.length || 0) > 0 ? 'success' : ''}`}
              >
                {draft.financialStatements?.length || 0} Fiscal Years
              </span>
            </div>
            <p className="fap-acc-subtitle">
              Three years of financial performance. All figures in IDR (Max. 3 fiscal years)
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
              handleTriggerSync('fap-preview-sec-financial');
              setOpenSections(s => ({...s, ['fap-preview-sec-financial']: true}));
            }}
          >
            <Eye size={12} /> Sync View
          </button>
          <span className={`fap-acc-chevron ${openSections['fap-preview-sec-financial'] ? 'rotate' : ''}`}>
            <ChevronDown size={17} />
          </span>
        </div>
      </div>
      {openSections['fap-preview-sec-financial'] && (
        <div className="fap-accordion-content">
          <FinancialStatementsCarousel />
        </div>
      )}
    </div>
  );
}
