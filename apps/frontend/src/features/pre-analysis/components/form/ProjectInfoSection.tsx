/** Form section 2: Project Information. */
import {usePreAnalysis} from '@/features/pre-analysis/components/PreAnalysisContext';
import {PreAnalysisRichEditor} from '@/features/pre-analysis/components/PreAnalysisRichEditor';
import {ChevronDown} from 'lucide-react';

export function ProjectInfoSection() {
  const {data, openSections, toggleSection, scrollToPreviewElement, updateField} = usePreAnalysis();
  return (
    <div
      id="acc-sec2"
      className="fap-accordion-card"
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <div
        className="fap-accordion-header"
        onClick={() => toggleSection('sec2')}
        style={{
          padding: '10px 14px',
          background: '#f8fafc',
          borderBottom: openSections.sec2 ? '1px solid #e2e8f0' : 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <span
            className="badge-chip"
            style={{
              background: '#dbeafe',
              color: '#1e40af',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            02
          </span>
          <span style={{fontWeight: 700, fontSize: '0.85rem', color: '#1e3a8a'}}>2. PROJECT INFORMATION</span>
        </div>
        <div className="fap-acc-actions" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <span className={`fap-acc-chevron ${openSections.sec2 ? 'rotate' : ''}`}>
            <ChevronDown size={16} />
          </span>
        </div>
      </div>
      {openSections.sec2 && (
        <div
          className="fap-accordion-content"
          style={{padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px'}}
        >
          <div>
            <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>
              Holding Group / Parent Company (Perusahaan Utama)
            </label>
            <input
              type="text"
              name="holdingGroup"
              data-field="holdingGroup"
              value={data.holdingGroup || ''}
              onChange={e => updateField('holdingGroup', e.target.value)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-holdingGroup')}
              placeholder="STAR GROUP (PT Sentosa Abadi Raja)"
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '0.8rem',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
              }}
            />
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px'}}>
            <div>
              <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>
                Project Name (Nama Objek Proyek)
              </label>
              <input
                type="text"
                name="projectName"
                data-field="projectName"
                value={data.projectName || ''}
                onChange={e => updateField('projectName', e.target.value)}
                onFocus={() => scrollToPreviewElement('preana-preview-cell-projectName')}
                placeholder="Land Clearing, Wood Hauling & Harvesting"
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                }}
              />
            </div>
            <div>
              <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>
                Project Location (Lokasi Proyek)
              </label>
              <input
                type="text"
                name="projectLocation"
                data-field="projectLocation"
                value={data.projectLocation || ''}
                onChange={e => updateField('projectLocation', e.target.value)}
                onFocus={() => scrollToPreviewElement('preana-preview-cell-projectLocation')}
                placeholder="Sumatera Area & Kalimantan Timur"
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                }}
              />
            </div>
          </div>
          <div>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#475569',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Existing Projects (Proyek Yang Sedang Berjalan - PT HPS & PT PASS)</span>
              <span style={{fontSize: '0.68rem', color: '#166534', fontWeight: 600}}>Active Contracts</span>
            </label>
            <PreAnalysisRichEditor
              value={data.existingProjects || ''}
              onChange={val => updateField('existingProjects', val)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-existingProjects')}
              placeholder="A. PT Handalan Putramas Santosa (HPS)..."
              height={180}
              dataField="existingProjects"
            />
          </div>
          <div>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#475569',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>New Projects (Pipeline Proyek Baru / Diajukan - PT HTPS)</span>
              <span style={{fontSize: '0.68rem', color: '#b45309', fontWeight: 600}}>Proposed Pipeline</span>
            </label>
            <PreAnalysisRichEditor
              value={data.newProjects || ''}
              onChange={val => updateField('newProjects', val)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-newProjects')}
              placeholder="C. PT Harta Putramas Santosa (HTPS)..."
              height={160}
              dataField="newProjects"
            />
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px'}}>
            <div>
              <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>Role of Customer</label>
              <input
                type="text"
                name="customerRole"
                data-field="customerRole"
                value={data.customerRole}
                onChange={e => updateField('customerRole', e.target.value)}
                onFocus={() => scrollToPreviewElement('preana-preview-cell-customerRole')}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                }}
              />
            </div>
            <div>
              <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>
                Other Contractor work in the same bowheer
              </label>
              <input
                type="text"
                name="otherContractors"
                data-field="otherContractors"
                value={data.otherContractors}
                onChange={e => updateField('otherContractors', e.target.value)}
                onFocus={() => scrollToPreviewElement('preana-preview-cell-otherContractors')}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                }}
              />
            </div>
          </div>
          <div>
            <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>Project Owner</label>
            <PreAnalysisRichEditor
              value={data.projectOwner || ''}
              onChange={val => updateField('projectOwner', val)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-projectOwner')}
              height={120}
              dataField="projectOwner"
            />
          </div>
          <div>
            <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>
              Bowheer Information
            </label>
            <PreAnalysisRichEditor
              value={data.bowheerInfo || ''}
              onChange={val => updateField('bowheerInfo', val)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-bowheerInfo')}
              height={130}
              dataField="bowheerInfo"
            />
          </div>
          <div>
            <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>Project Status</label>
            <input
              type="text"
              name="projectStatus"
              data-field="projectStatus"
              value={data.projectStatus}
              onChange={e => updateField('projectStatus', e.target.value)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-projectStatus')}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '0.8rem',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
              }}
            />
          </div>
          <div>
            <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>Investment Plan</label>
            <PreAnalysisRichEditor
              value={data.investmentPlan || ''}
              onChange={val => updateField('investmentPlan', val)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-investmentPlan')}
              height={130}
              dataField="investmentPlan"
            />
          </div>
          <div>
            <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>
              Financing Scheme Requested
            </label>
            <input
              type="text"
              name="financingSchemeRequested"
              data-field="financingSchemeRequested"
              value={data.financingSchemeRequested}
              onChange={e => updateField('financingSchemeRequested', e.target.value)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-financingSchemeRequested')}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '0.8rem',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
