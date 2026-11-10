/** Customer section 06: Segmentation & Active Projects. */
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
    targetProjectRow,
    setTargetProjectRow,
  } = useWorkspace();

  const renderSegmentAndBusinessChecklist = () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '12px',
        marginTop: '14px',
        background: '#f8fafc',
        padding: '12px 14px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
      }}
    >
      {/* Segmentasi / Segmentation */}
      <div data-field="industrySegment">
        <label style={{display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: 8}}>
          Segmentasi / Segmentation :
        </label>
        <div style={{display: 'flex', flexDirection: 'column', gap: 5}}>
          {[
            {value: 'MINING', label: 'Pertambangan/Mining'},
            {value: 'AGRICULTURE', label: 'Pertanian/Agriculture'},
            {value: 'FORESTRY', label: 'Kehutanan/Forestry'},
            {value: 'CONSTRUCTION', label: 'Konstruksi/Construction'},
            {value: 'OIL_AND_GAS', label: 'Oil & Gas'},
            {value: 'OTHER', label: 'Lainnya/Other'},
          ].map(opt => {
            const curSeg = String(draft.industrySegment || '').trim().toUpperCase();
            const isChecked = Boolean(
              curSeg &&
                (curSeg === opt.value ||
                  (opt.value === 'OIL_AND_GAS' && (curSeg === 'OIL_GAS' || curSeg.includes('OIL'))) ||
                  curSeg.includes(opt.value)),
            );
            return (
              <label
                key={opt.value}
                onClick={() => {
                  const newVal = isChecked ? '' : opt.value;
                  setDraft({...draft, industrySegment: newVal});
                  handleTriggerFieldSync('industrySegment', 'business');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: `1px solid ${isChecked ? '#2563eb' : '#cbd5e1'}`,
                  background: isChecked ? '#eff6ff' : '#ffffff',
                  cursor: canEditCustomerPic ? 'pointer' : 'default',
                  fontSize: '0.78rem',
                  color: isChecked ? '#1d4ed8' : '#334155',
                  fontWeight: isChecked ? 600 : 400,
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 3,
                    border: `1.5pt solid ${isChecked ? '#2563eb' : '#94a3b8'}`,
                    background: isChecked ? '#2563eb' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    flexShrink: 0,
                  }}
                >
                  {isChecked ? '✓' : ''}
                </div>
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Bisnis Utama / Main Business */}
      <div data-field="businessRole">
        <label style={{display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: 8}}>
          Bisnis Utama / Main Business :
        </label>
        <div style={{display: 'flex', flexDirection: 'column', gap: 5}}>
          {[
            {value: 'CONS_OWNER', label: 'Cons. Owner'},
            {value: 'CONTRACTORS', label: 'Contractors'},
            {value: 'SUB_CONT', label: 'Sub Cont'},
            {value: 'RENTAL', label: 'Rental'},
            {value: 'OTHER', label: 'Other'},
          ].map(opt => {
            const curRole = String(draft.businessRole || '').trim().toUpperCase();
            const isChecked = Boolean(
              curRole &&
                (curRole === opt.value ||
                  (opt.value === 'CONTRACTORS' &&
                    (curRole === 'CONTRACTOR' || curRole === 'CONTRACTORS' || curRole.includes('KONTRAKTOR'))) ||
                  (opt.value === 'SUB_CONT' &&
                    (curRole === 'SUB_CONT' || curRole === 'SUB_CONTRACTOR' || curRole.startsWith('SUB'))) ||
                  (opt.value === 'CONS_OWNER' &&
                    (curRole === 'CONS_OWNER' || curRole === 'CONCESSION_OWNER' || curRole.includes('OWNER'))) ||
                  curRole.includes(opt.value)),
            );
            return (
              <label
                key={opt.value}
                onClick={() => {
                  const newVal = isChecked ? '' : opt.value;
                  setDraft({...draft, businessRole: newVal});
                  handleTriggerFieldSync('businessRole', 'business');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: `1px solid ${isChecked ? '#2563eb' : '#cbd5e1'}`,
                  background: isChecked ? '#eff6ff' : '#ffffff',
                  cursor: canEditCustomerPic ? 'pointer' : 'default',
                  fontSize: '0.78rem',
                  color: isChecked ? '#1d4ed8' : '#334155',
                  fontWeight: isChecked ? 600 : 400,
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 3,
                    border: `1.5pt solid ${isChecked ? '#2563eb' : '#94a3b8'}`,
                    background: isChecked ? '#2563eb' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    flexShrink: 0,
                  }}
                >
                  {isChecked ? '✓' : ''}
                </div>
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );

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
          {renderSegmentAndBusinessChecklist()}
          <div style={{marginTop: 14}} />
          <Repeater
            title="Project Contracts"
            description="Active project contracts and business activities (filled by Marketing)."
            fields={projectFields}
            rows={draft.projects || []}
            disabled={!canEditCustomerPic}
            carousel
            section="projects"
            targetRowIndex={targetProjectRow}
            onRowChange={setTargetProjectRow}
            onFieldFocus={(k, s) => handleTriggerFieldSync(k, s || `projects-${targetProjectRow || 0}`)}
            onFieldSync={(k, s) => handleTriggerFieldSync(k, s || `projects-${targetProjectRow || 0}`)}
            activeFieldKey={activeFieldKey}
            onChange={projects => setDraft({...draft, projects})}
          />
        </div>
      )}
    </div>
  );
}
