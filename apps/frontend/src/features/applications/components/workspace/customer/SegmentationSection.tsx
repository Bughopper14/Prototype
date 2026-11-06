/** Customer section 05: Segmentation & Active Projects. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {Repeater} from '@/shared/ui/Repeater';
import {projectFields} from '@liugong/shared';
import {ChevronDown, Eye} from 'lucide-react';

export function SegmentationSection() {
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
      className={`fap-accordion-card ${openSections['fap-preview-sec-projects'] ? 'is-open' : 'is-closed'}`}
      id="acc-fap-preview-sec-projects"
    >
      <div className="fap-accordion-header" onClick={() => toggleSection('fap-preview-sec-projects')}>
        <div className="fap-acc-header-left">
          <span className="fap-acc-step-badge">05</span>
          <div className="fap-acc-titles">
            <div className="fap-acc-title-row">
              <h4 className="fap-acc-title">Industry Segmentation & Active Projects</h4>
              <span className={`fap-acc-badge ${(draft.projects?.length || 0) > 0 ? 'success' : ''}`}>
                {draft.projects?.length || 0} Projects
              </span>
            </div>
            <p className="fap-acc-subtitle">Debtor's active project contracts and business activities</p>
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
          <Repeater
            title="Project Contracts"
            description="Active project contracts and business activities (filled by Marketing)."
            fields={projectFields}
            rows={draft.projects || []}
            disabled={!canEditCustomerPic}
            carousel
            section="projects"
            onFieldFocus={k => handleTriggerFieldSync(k, 'projects')}
            onFieldSync={k => handleTriggerFieldSync(k, 'projects')}
            activeFieldKey={activeFieldKey}
            onChange={projects => setDraft({...draft, projects})}
          />
        </div>
      )}
    </div>
  );
}
