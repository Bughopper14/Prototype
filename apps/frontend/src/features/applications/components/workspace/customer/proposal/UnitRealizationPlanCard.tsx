/** Sub-section 3 of the financing proposal: units to be realized by brand and equipment type. */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {FileSpreadsheet} from 'lucide-react';

export function UnitRealizationPlanCard() {
  const {draft, setDraft, handleTriggerFieldSync, canFinance} = useWorkspace();
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div>
          <h5
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#0f172a',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <FileSpreadsheet size={15} style={{color: '#0284c7'}} />
            Rencana Realisasi Unit / Unit Realization Plan
          </h5>
          <p style={{fontSize: '12px', color: '#64748b'}}>
            Summary of units to be realized by brand and equipment type
          </p>
        </div>
      </div>

      {(() => {
        const rPlan = draft.financingProposal?.realizationPlan || {};
        const lgHe = Number(rPlan.lgHe) || 0;
        const lgTruck = Number(rPlan.lgTruck) || 0;
        const lgUnit = lgHe + lgTruck;
        const nlgHe = Number(rPlan.nlgHe) || 0;
        const nlgTruck = Number(rPlan.nlgTruck) || 0;
        const nlgUnit = nlgHe + nlgTruck;
        const totHe = lgHe + nlgHe;
        const totTruck = lgTruck + nlgTruck;
        const totUnit = lgUnit + nlgUnit;

        const updatePlan = (patch: Record<string, number>) => {
          setDraft((prev: any) => ({
            ...prev,
            financingProposal: {
              ...(prev.financingProposal || {}),
              realizationPlan: {
                ...(prev.financingProposal?.realizationPlan || {}),
                ...patch,
              },
            },
          }));
        };

        return (
          <div style={{overflowX: 'auto'}}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'center',
                fontSize: '0.82rem',
              }}
            >
              <thead>
                <tr style={{background: '#f1f5f9', borderBottom: '1.5pt solid #cbd5e1'}}>
                  <th
                    style={{
                      padding: '8px 10px',
                      textAlign: 'left',
                      fontWeight: 700,
                      color: '#334155',
                    }}
                  >
                    Brand
                  </th>
                  <th style={{padding: '8px 10px', fontWeight: 700, color: '#334155', width: 110}}>HE</th>
                  <th style={{padding: '8px 10px', fontWeight: 700, color: '#334155', width: 110}}>Truck</th>
                  <th
                    style={{
                      padding: '8px 10px',
                      fontWeight: 700,
                      color: '#334155',
                      width: 110,
                      background: '#e2e8f0',
                    }}
                  >
                    Unit
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Liugong */}
                <tr style={{borderBottom: '1px solid #e2e8f0'}}>
                  <td
                    style={{
                      padding: '8px 10px',
                      textAlign: 'left',
                      fontWeight: 700,
                      color: '#1d4ed8',
                    }}
                  >
                    Liugong
                  </td>
                  <td style={{padding: '4px'}} data-field="propAssetLgHe">
                    <input
                      type="number"
                      min="0"
                      id="fap-form-propAssetLgHe"
                      data-field="propAssetLgHe"
                      className="input-field"
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        padding: '5px 2px',
                        fontSize: '0.85rem',
                      }}
                      disabled={!canFinance}
                      value={rPlan.lgHe ?? 0}
                      onFocus={() => handleTriggerFieldSync('propAssetLgHe', 'proposal')}
                      onChange={e => updatePlan({lgHe: parseInt(e.target.value, 10) || 0})}
                    />
                  </td>
                  <td style={{padding: '4px'}} data-field="propAssetLgTruck">
                    <input
                      type="number"
                      min="0"
                      id="fap-form-propAssetLgTruck"
                      data-field="propAssetLgTruck"
                      className="input-field"
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        padding: '5px 2px',
                        fontSize: '0.85rem',
                      }}
                      disabled={!canFinance}
                      value={rPlan.lgTruck ?? 0}
                      onFocus={() => handleTriggerFieldSync('propAssetLgTruck', 'proposal')}
                      onChange={e => updatePlan({lgTruck: parseInt(e.target.value, 10) || 0})}
                    />
                  </td>
                  <td
                    id="fap-form-propAssetLgUnit"
                    data-field="propAssetLgUnit"
                    onClick={() => handleTriggerFieldSync('propAssetLgUnit', 'proposal')}
                    style={{
                      padding: '8px 10px',
                      fontWeight: 700,
                      background: '#f8fafc',
                      color: '#0f172a',
                      cursor: 'pointer',
                    }}
                    title="Click to highlight in FAP preview"
                  >
                    {lgUnit}
                  </td>
                </tr>

                {/* Non Liugong */}
                <tr style={{borderBottom: '1px solid #e2e8f0'}}>
                  <td
                    style={{
                      padding: '8px 10px',
                      textAlign: 'left',
                      fontWeight: 700,
                      color: '#475569',
                    }}
                  >
                    Non Liugong
                  </td>
                  <td style={{padding: '4px'}} data-field="propAssetNlgHe">
                    <input
                      type="number"
                      min="0"
                      id="fap-form-propAssetNlgHe"
                      data-field="propAssetNlgHe"
                      className="input-field"
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        padding: '5px 2px',
                        fontSize: '0.85rem',
                      }}
                      disabled={!canFinance}
                      value={rPlan.nlgHe ?? 0}
                      onFocus={() => handleTriggerFieldSync('propAssetNlgHe', 'proposal')}
                      onChange={e => updatePlan({nlgHe: parseInt(e.target.value, 10) || 0})}
                    />
                  </td>
                  <td style={{padding: '4px'}} data-field="propAssetNlgTruck">
                    <input
                      type="number"
                      min="0"
                      id="fap-form-propAssetNlgTruck"
                      data-field="propAssetNlgTruck"
                      className="input-field"
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        padding: '5px 2px',
                        fontSize: '0.85rem',
                      }}
                      disabled={!canFinance}
                      value={rPlan.nlgTruck ?? 0}
                      onFocus={() => handleTriggerFieldSync('propAssetNlgTruck', 'proposal')}
                      onChange={e => updatePlan({nlgTruck: parseInt(e.target.value, 10) || 0})}
                    />
                  </td>
                  <td
                    id="fap-form-propAssetNlgUnit"
                    data-field="propAssetNlgUnit"
                    onClick={() => handleTriggerFieldSync('propAssetNlgUnit', 'proposal')}
                    style={{
                      padding: '8px 10px',
                      fontWeight: 700,
                      background: '#f8fafc',
                      color: '#0f172a',
                      cursor: 'pointer',
                    }}
                    title="Click to highlight in FAP preview"
                  >
                    {nlgUnit}
                  </td>
                </tr>

                {/* Total Row */}
                <tr style={{background: '#f1f5f9', fontWeight: 800, borderTop: '1.5pt solid #cbd5e1'}}>
                  <td style={{padding: '8px 10px', textAlign: 'left', color: '#0f172a'}}>Total</td>
                  <td style={{padding: '8px 10px', color: '#0f172a'}}>{totHe}</td>
                  <td style={{padding: '8px 10px', color: '#0f172a'}}>{totTruck}</td>
                  <td
                    id="fap-form-propAssetTotUnit"
                    data-field="propAssetTotUnit"
                    onClick={() => handleTriggerFieldSync('propAssetTotUnit', 'proposal')}
                    style={{
                      padding: '8px 10px',
                      color: '#0f172a',
                      background: '#e2e8f0',
                      cursor: 'pointer',
                    }}
                    title="Click to highlight in FAP preview"
                  >
                    {totUnit}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })()}
    </div>
  );
}
