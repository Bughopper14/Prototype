/** Customer section 05: financing purpose and the list of fixed assets (LiuGong vs non-LiuGong). */
import {FixedAssetsTable} from '@/features/applications/components/workspace/customer/purpose-assets/FixedAssetsTable';
import {FinancingPurposeColumn} from '@/features/applications/components/workspace/customer/purpose-assets/FinancingPurposeColumn';
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {ChevronDown, Eye} from 'lucide-react';

export function PurposeAssetsSection() {
  const {draft, openSections, setOpenSections, handleTriggerSync, toggleSection} = useWorkspace();
  return (
    <div
      className={`fap-accordion-card ${openSections['fap-preview-sec-purpose-assets'] ? 'is-open' : 'is-closed'}`}
      id="acc-fap-preview-sec-purpose-assets"
      data-section="purpose-assets"
    >
      <div className="fap-accordion-header" onClick={() => toggleSection('fap-preview-sec-purpose-assets')}>
        <div className="fap-acc-header-left">
          <span className="fap-acc-step-badge">05</span>
          <div className="fap-acc-titles">
            <div className="fap-acc-title-row">
              <h4 className="fap-acc-title">Financing Purpose & List of Fixed Assets</h4>
              <span
                className={`fap-acc-badge ${(Number(draft.assetSummaryHeLiuGong) || 0) + (Number(draft.assetSummaryTruckLiuGong) || 0) + (Number(draft.assetSummaryHeNonLiuGong) || 0) + (Number(draft.assetSummaryTruckNonLiuGong) || 0) > 0 ? 'success' : ''}`}
              >
                {(Number(draft.assetSummaryHeLiuGong) || 0) +
                  (Number(draft.assetSummaryTruckLiuGong) || 0) +
                  (Number(draft.assetSummaryHeNonLiuGong) || 0) +
                  (Number(draft.assetSummaryTruckNonLiuGong) || 0)}{' '}
                Total Units
              </span>
            </div>
            <p className="fap-acc-subtitle">
              Tujuan pembiayaan dan ringkasan kepemilikan aset tetap (LiuGong vs Non-LiuGong)
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
              handleTriggerSync('fap-preview-sec-purpose-assets');
              setOpenSections(s => ({...s, ['fap-preview-sec-purpose-assets']: true}));
            }}
          >
            <Eye size={12} /> Sync View
          </button>
          <span
            className={`fap-acc-chevron ${openSections['fap-preview-sec-purpose-assets'] ? 'rotate' : ''}`}
          >
            <ChevronDown size={17} />
          </span>
        </div>
      </div>
      {openSections['fap-preview-sec-purpose-assets'] &&
        (() => {
          return (
            <div className="fap-accordion-content">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '16px',
                  alignItems: 'start',
                }}
              >
                {/* Left: Tujuan Pembiayaan / Financing Purpose */}
                <FinancingPurposeColumn />

                {/* Right: List Fixed Assets Table */}
                <FixedAssetsTable />
              </div>
            </div>
          );
        })()}
    </div>
  );
}
