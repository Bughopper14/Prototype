/** Customer section 06: industry segmentation, main business and active project contracts. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {SegmentChecklist} from '@/features/applications/components/workspace/customer/SegmentChecklist';
import {Repeater} from '@/shared/ui/Repeater';
import {projectFields} from '@liugong/shared';
import {ChevronDown, Eye} from 'lucide-react';

export function SegmentationSection() {
  const {
    draft,
    setDraft,
    openSections,
    setOpenSections,
    handleTriggerFieldSync,
    handleTriggerSync,
    toggleSection,
    canEditCustomerPic,
    activeFieldKey,
    targetProjectRow,
    setTargetProjectRow,
  } = useWorkspace();

  return (
    <div
      className={`fap-accordion-card ${openSections['fap-preview-sec-projects'] ? 'is-open' : 'is-closed'}`}
      id="acc-fap-preview-sec-projects"
      data-section="projects"
    >
      <div className="fap-accordion-header" onClick={() => toggleSection('fap-preview-sec-projects')}>
        <div className="fap-acc-header-left">
          <span className="fap-acc-step-badge">06</span>
          <div className="fap-acc-titles">
            <div className="fap-acc-title-row">
              <h4 className="fap-acc-title">Segmentation &amp; Active Projects</h4>
              <span className="fap-acc-badge">{draft.projects?.length || 0} Projects</span>
            </div>
            <p className="fap-acc-subtitle">Industry segmentation, business category, and active projects</p>
          </div>
        </div>
        <div className="fap-acc-header-right">
          <button
            type="button"
            className="fap-acc-sync-btn"
            title="Sync preview document to this section"
            onClick={e => {
              e.stopPropagation();
              handleTriggerSync('fap-preview-sec-projects');
              setOpenSections(s => ({...s, ['fap-preview-sec-projects']: true}));
            }}
          >
            <Eye size={12} /> Sync View
          </button>
          <span className={`fap-acc-chevron ${openSections['fap-preview-sec-projects'] ? 'rotate' : ''}`}>
            <ChevronDown size={17} />
          </span>
        </div>
      </div>
      {openSections['fap-preview-sec-projects'] && (
        <div className="fap-accordion-content">
          <SegmentChecklist />
          <div style={{marginTop: 14}} />
          <Repeater
            title="Project Contracts"
            description="Active contracts and work projects currently undertaken by the applicant."
            fields={projectFields}
            rows={draft.projects || []}
            disabled={!canEditCustomerPic}
            carousel
            onChange={r => setDraft({...draft, projects: r})}
            section="projects"
            onFieldFocus={handleTriggerFieldSync}
            onFieldSync={handleTriggerFieldSync}
            activeFieldKey={activeFieldKey}
            targetRowIndex={targetProjectRow}
            onRowChange={setTargetProjectRow}
          />
        </div>
      )}
    </div>
  );
}
