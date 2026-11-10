/** Form section 3: Customer & Group Background, incl. the group structure builder. */
import {usePreAnalysis} from '@/features/pre-analysis/components/PreAnalysisContext';
import {PreAnalysisRichEditor} from '@/features/pre-analysis/components/PreAnalysisRichEditor';
import {ChevronDown, Trash2} from 'lucide-react';

import {HoldingCompanyEditor} from '@/features/pre-analysis/components/form/group-structure/HoldingCompanyEditor';
import {SubsidiariesEditor} from '@/features/pre-analysis/components/form/group-structure/SubsidiariesEditor';
export function CustomerGroupSection() {
  const {data, openSections, toggleSection, scrollToPreviewElement, updateField, addSubsidiary} =
    usePreAnalysis();
  return (
    <div
      id="acc-sec3"
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
        onClick={() => toggleSection('sec3')}
        style={{
          padding: '10px 14px',
          background: '#f8fafc',
          borderBottom: openSections.sec3 ? '1px solid #e2e8f0' : 'none',
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
            03
          </span>
          <span style={{fontWeight: 700, fontSize: '0.85rem', color: '#1e3a8a'}}>
            3. CUSTOMER & GROUP BACKGROUND
          </span>
        </div>
        <div className="fap-acc-actions" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <span className={`fap-acc-chevron ${openSections.sec3 ? 'rotate' : ''}`}>
            <ChevronDown size={16} />
          </span>
        </div>
      </div>
      {openSections.sec3 && (
        <div
          className="fap-accordion-content"
          style={{padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px'}}
        >
          <div>
            <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>
              UBO (Ultimate Beneficiary Owner)
            </label>
            <PreAnalysisRichEditor
              value={data.uboInfo || data.ubo || ''}
              onChange={val => {
                updateField('uboInfo', val);
                updateField('ubo', val);
              }}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInfo')}
              height={130}
              dataField="uboInfo"
            />
          </div>
          <div>
            <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>
              Company Background (Brief Entity & Holding Profile)
            </label>
            <PreAnalysisRichEditor
              value={data.companyBackground || ''}
              onChange={val => updateField('companyBackground', val)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-companyBackground')}
              height={150}
              dataField="companyBackground"
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
              <span>STAR Group – Key Milestones Narrative (Riwayat & Narasi Ekspansi)</span>
              <span style={{fontSize: '0.68rem', color: '#1e40af', fontWeight: 600}}>
                2022 - 2026 Expansion
              </span>
            </label>
            <PreAnalysisRichEditor
              value={data.starGroupMilestonesNarrative || ''}
              onChange={val => updateField('starGroupMilestonesNarrative', val)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-starGroupMilestonesNarrative')}
              height={180}
              dataField="starGroupMilestonesNarrative"
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
              <span>Business Development Background (Kemitraan Herry Tho & Rekam Jejak)</span>
              <span style={{fontSize: '0.68rem', color: '#dc2626', fontWeight: 600}}>Key Risk Factor</span>
            </label>
            <PreAnalysisRichEditor
              value={data.businessDevBackground || ''}
              onChange={val => updateField('businessDevBackground', val)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-businessDevBackground')}
              height={160}
              dataField="businessDevBackground"
            />
          </div>
          <div>
            <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>
              Other Information (Field Team Readiness & Harvesting Personnel)
            </label>
            <PreAnalysisRichEditor
              value={data.operationalTeamInfo || ''}
              onChange={val => updateField('operationalTeamInfo', val)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-operationalTeamInfo')}
              height={130}
              dataField="operationalTeamInfo"
            />
          </div>
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>
                UBO Information (Group Shareholding Structure & Legal Profile)
              </label>
              <span
                style={{
                  fontSize: '0.68rem',
                  color: '#1e40af',
                  fontWeight: 600,
                  background: '#dbeafe',
                  padding: '1px 6px',
                  borderRadius: '3px',
                }}
              >
                Separate Section Before Milestones
              </span>
            </div>
            <PreAnalysisRichEditor
              value={data.uboInformation || ''}
              onChange={val => updateField('uboInformation', val)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-uboInformation')}
              placeholder="STAR GROUP Corporate Ownership Structure..."
              height={180}
              dataField="uboInformation"
            />
            <div
              id="preana-form-group-structure-builder"
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '12px',
                background: '#f8fafc',
                marginTop: '6px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <div>
                  <div style={{fontSize: '0.8rem', fontWeight: 700, color: '#0f294a'}}>
                    Group Shareholding Structure Chart (Input System)
                  </div>
                  <div style={{fontSize: '0.68rem', color: '#64748b'}}>
                    Input holding and subsidiary entities. The visual hierarchy tree is automatically
                    generated in the Digital Twin preview.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addSubsidiary}
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: '4px',
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  + Add Subsidiary
                </button>
              </div>

              {/* 1. HOLDING COMPANY (ENTITAS INDUK) */}
              <HoldingCompanyEditor />

              {/* 2. SUBSIDIARY ENTITIES (ANAK PERUSAHAAN) */}
              <SubsidiariesEditor />
            </div>
          </div>
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>
                Company Milestones
              </label>
              <button
                type="button"
                onClick={() => {
                  const next = [...(data.milestones || []), {year: '', milestone: ''}];
                  updateField('milestones', next);
                }}
                style={{
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: '#eff6ff',
                  color: '#1e40af',
                  border: '1px solid #bfdbfe',
                  cursor: 'pointer',
                }}
              >
                + Add Milestone
              </button>
            </div>
            <div style={{border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden'}}>
              <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem'}}>
                <thead style={{background: '#f8fafc', borderBottom: '1px solid #e2e8f0'}}>
                  <tr>
                    <th style={{width: '18%', padding: '6px 8px', textAlign: 'left'}}>Year</th>
                    <th style={{padding: '6px 8px', textAlign: 'left'}}>Milestone</th>
                    <th style={{width: '40px', padding: '6px 8px'}}></th>
                  </tr>
                </thead>
                <tbody>
                  {(data.milestones || []).map((m, idx) => (
                    <tr key={idx} style={{borderBottom: '1px solid #f1f5f9'}}>
                      <td style={{padding: '4px 6px'}}>
                        <input
                          type="text"
                          value={m.year || ''}
                          onChange={e => {
                            const copy = [...data.milestones];
                            copy[idx] = {...copy[idx], year: e.target.value};
                            updateField('milestones', copy);
                          }}
                          style={{
                            width: '100%',
                            padding: '4px',
                            fontSize: '0.75rem',
                            border: '1px solid #cbd5e1',
                            borderRadius: '3px',
                          }}
                        />
                      </td>
                      <td style={{padding: '4px 6px'}}>
                        <textarea
                          rows={2}
                          value={m.milestone || m.description || ''}
                          onChange={e => {
                            const copy = [...data.milestones];
                            copy[idx] = {...copy[idx], milestone: e.target.value};
                            updateField('milestones', copy);
                          }}
                          style={{
                            width: '100%',
                            padding: '4px',
                            fontSize: '0.75rem',
                            border: '1px solid #cbd5e1',
                            borderRadius: '3px',
                          }}
                        />
                      </td>
                      <td style={{padding: '4px 6px', textAlign: 'center'}}>
                        <button
                          type="button"
                          onClick={() => {
                            const copy = data.milestones.filter((_, i) => i !== idx);
                            updateField('milestones', copy);
                          }}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#ef4444',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <label style={{fontSize: '0.75rem', fontWeight: 600, color: '#475569'}}>
              Existing Finco Backup
            </label>
            <input
              type="text"
              name="existingFincoBackup"
              data-field="existingFincoBackup"
              value={data.existingFincoBackup}
              onChange={e => updateField('existingFincoBackup', e.target.value)}
              onFocus={() => scrollToPreviewElement('preana-preview-cell-existingFincoBackup')}
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
