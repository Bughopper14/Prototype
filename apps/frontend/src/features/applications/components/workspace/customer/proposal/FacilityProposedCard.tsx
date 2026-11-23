/** Sub-section 1 of the financing proposal: the facility proposed (method, value, currency choice). */
import {RequiredStar} from '@/shared/ui/RequiredStar';
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {useMasterData} from '@/shared/master-data';
import {FileText} from 'lucide-react';

export function FacilityProposedCard() {
  const {draft, setDraft, handleTriggerFieldSync, canProposal} = useWorkspace();
  const master = useMasterData();
  return (
    <div
      style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '16px',
      }}
    >
      <h5
        style={{
          fontSize: '13px',
          fontWeight: 700,
          color: '#0f172a',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <FileText size={15} style={{color: '#0284c7'}} />
        Facility Proposed
      </h5>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '14px',
        }}
      >
        <div className="field-group" data-field="financingMethod">
          <label className="field-label">
            Cara Pembiayaan / Financing Method
            <RequiredStar field="financingMethod" section="Financing Proposal" />
          </label>
          <select
            id="fap-form-financingMethod"
            data-field="financingMethod"
            className="field-input"
            value={draft.financingProposal?.facilityProposed?.financingMethod || ''}
            disabled={!canProposal}
            onFocus={() => handleTriggerFieldSync('financingMethod', 'proposal')}
            onChange={e => {
              const val = e.target.value;
              setDraft((prev: any) => ({
                ...prev,
                financingProposal: {
                  ...(prev.financingProposal || {}),
                  facilityProposed: {
                    ...(prev.financingProposal?.facilityProposed || {}),
                    financingMethod: val,
                  },
                },
              }));
            }}
          >
            <option value="" disabled hidden>
              Select financing method
            </option>
            {(master.financingMethod || [])
              .filter(x => x.active || x.value === draft.financingProposal?.facilityProposed?.financingMethod)
              .map(x => (
                <option key={x.value} value={x.value}>
                  {x.name || x.value}
                </option>
              ))}
          </select>
        </div>

        <div className="field-group" data-field="financingValueProp">
          <label className="field-label">
            Nilai Pembiayaan / Financing Value
            <RequiredStar field="financingValueProp" section="Financing Proposal" />
          </label>
          <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
            <div
              style={{
                display: 'inline-flex',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                overflow: 'hidden',
                background: '#fff',
              }}
            >
              {(master.currency || []).filter(x => x.active).map(x => x.value).map(c => {
                const currentChoice = draft.financingProposal?.facilityProposed?.currencyChoice;
                const isSel = currentChoice === c;
                return (
                  <button
                    key={c}
                    type="button"
                    data-field="currencyChoice"
                    disabled={!canProposal}
                    onClick={() => {
                      const nextVal = isSel ? '' : c;
                      setDraft((prev: any) => ({
                        ...prev,
                        financingProposal: {
                          ...(prev.financingProposal || {}),
                          facilityProposed: {
                            ...(prev.financingProposal?.facilityProposed || {}),
                            currencyChoice: nextVal,
                          },
                        },
                      }));
                      handleTriggerFieldSync('currencyChoice', 'proposal');
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: 'none',
                      background: isSel ? '#002c5f' : '#ffffff',
                      color: isSel ? '#ffffff' : '#64748b',
                      transition: 'all 0.15s',
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <RequiredStar field="currencyChoice" section="Financing Proposal" />
            <input
              type="text"
              id="fap-form-financingValueProp"
              data-field="financingValueProp"
              className="field-input"
              style={{flex: 1}}
              value={draft.financingProposal?.facilityProposed?.financingValue || ''}
              disabled={!canProposal}
              onFocus={() => handleTriggerFieldSync('financingValueProp', 'proposal')}
              onChange={e => {
                const val = e.target.value;
                setDraft((prev: any) => ({
                  ...prev,
                  financingProposal: {
                    ...(prev.financingProposal || {}),
                    facilityProposed: {
                      ...(prev.financingProposal?.facilityProposed || {}),
                      financingValue: val,
                    },
                  },
                }));
              }}
            />
          </div>
        </div>

        <div className="field-group" data-field="applicationSource">
          <label className="field-label">
            Application Source
            <RequiredStar field="applicationSource" section="Financing Proposal" />
          </label>
          <input
            type="text"
            id="fap-form-applicationSource"
            data-field="applicationSource"
            className="field-input"
            value={draft.financingProposal?.facilityProposed?.applicationSource || ''}
            disabled={!canProposal}
            onFocus={() => handleTriggerFieldSync('applicationSource', 'proposal')}
            onChange={e => {
              const val = e.target.value;
              setDraft((prev: any) => ({
                ...prev,
                financingProposal: {
                  ...(prev.financingProposal || {}),
                  facilityProposed: {
                    ...(prev.financingProposal?.facilityProposed || {}),
                    applicationSource: val,
                  },
                },
              }));
            }}
          />
        </div>
      </div>
    </div>
  );
}
