/** Sub-section 1 of the financing proposal: the facility proposed (method, value, currency choice). */
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import {parseMoney} from '@/features/applications/lib/financing-proposal';
import {
  FINANCING_METHODS,
  resolveFinancingMethod,
} from '@/features/applications/components/workspace/customer/proposal/terms-config';
import {FileText} from 'lucide-react';

const ALLOWED_KEYS = new Set([
  'Backspace',
  'Tab',
  'Enter',
  'Escape',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Delete',
  'Home',
  'End',
]);

function sanitizeNumericInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '');
  const dotIdx = cleaned.indexOf('.');
  if (dotIdx === -1) return cleaned;
  return cleaned.slice(0, dotIdx + 1) + cleaned.slice(dotIdx + 1).replace(/\./g, '');
}

export function FacilityProposedCard() {
  const {draft, setDraft, handleTriggerFieldSync, canFinance} = useWorkspace();
  const facProp = draft.financingProposal?.facilityProposed || {};
  const resolvedMethod = resolveFinancingMethod(facProp.financingMethod);
  const rawFinVal = facProp.financingValue;
  const displayFinVal =
    rawFinVal === undefined || rawFinVal === null || rawFinVal === ''
      ? ''
      : /^\d*\.?\d*$/.test(String(rawFinVal).trim())
        ? String(rawFinVal).trim()
        : String(parseMoney(rawFinVal) || '');

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
          <label className="field-label">Cara Pembiayaan / Financing Method</label>
          <select
            id="fap-form-financingMethod"
            data-field="financingMethod"
            className="field-input"
            style={{width: '100%'}}
            value={resolvedMethod?.label || ''}
            disabled={!canFinance}
            onFocus={() => handleTriggerFieldSync('financingMethod', 'proposal')}
            onChange={e => {
              const val = e.target.value;
              setDraft((prev: any) => {
                const prevFp = prev.financingProposal || {};
                const prevMethod = resolveFinancingMethod(prevFp.facilityProposed?.financingMethod);
                const nextMethod = resolveFinancingMethod(val);
                const currChoice = prevFp.facilityProposed?.currencyChoice || '';
                const nextFp: any = {
                  ...prevFp,
                  facilityProposed: {
                    ...(prevFp.facilityProposed || {}),
                    financingMethod: val,
                  },
                };
                if (prevMethod && prevMethod.group !== nextMethod?.group && currChoice) {
                  if (prevFp[prevMethod.group]?.currency === currChoice) {
                    nextFp[prevMethod.group] = {
                      ...(prevFp[prevMethod.group] || {}),
                      currency: '',
                    };
                  }
                }
                if (nextMethod && currChoice) {
                  nextFp[nextMethod.group] = {
                    ...(prevFp[nextMethod.group] || {}),
                    currency: currChoice,
                  };
                }
                return {...prev, financingProposal: nextFp};
              });
            }}
          >
            <option value="" disabled>
              -- Select Financing Method --
            </option>
            {FINANCING_METHODS.map(m => (
              <option key={m.label} value={m.label}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field-group" data-field="financingValueProp">
          <label className="field-label">Nilai Pembiayaan / Financing Value</label>
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
              {(['IDR', 'USD'] as const).map(c => {
                const currentChoice = facProp.currencyChoice;
                const isSel = currentChoice === c;
                return (
                  <button
                    key={c}
                    type="button"
                    data-field="currencyChoice"
                    disabled={!canFinance}
                    onClick={() => {
                      const nextVal = isSel ? '' : c;
                      setDraft((prev: any) => {
                        const prevFp = prev.financingProposal || {};
                        const activeMethod = resolveFinancingMethod(prevFp.facilityProposed?.financingMethod);
                        const nextFp: any = {
                          ...prevFp,
                          facilityProposed: {
                            ...(prevFp.facilityProposed || {}),
                            currencyChoice: nextVal,
                          },
                        };
                        if (activeMethod) {
                          nextFp[activeMethod.group] = {
                            ...(prevFp[activeMethod.group] || {}),
                            currency: nextVal,
                          };
                        }
                        return {...prev, financingProposal: nextFp};
                      });
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
            <input
              type="text"
              inputMode="decimal"
              id="fap-form-financingValueProp"
              data-field="financingValueProp"
              className="field-input"
              style={{flex: 1}}
              value={displayFinVal}
              disabled={!canFinance}
              onFocus={() => handleTriggerFieldSync('financingValueProp', 'proposal')}
              onKeyDown={e => {
                if (e.ctrlKey || e.metaKey || ALLOWED_KEYS.has(e.key)) return;
                if (/^\d$/.test(e.key)) return;
                if (e.key === '.' && !displayFinVal.includes('.')) return;
                e.preventDefault();
              }}
              onPaste={e => {
                e.preventDefault();
                const pasted = sanitizeNumericInput(e.clipboardData.getData('text') || '');
                if (!pasted) return;
                setDraft((prev: any) => ({
                  ...prev,
                  financingProposal: {
                    ...(prev.financingProposal || {}),
                    facilityProposed: {
                      ...(prev.financingProposal?.facilityProposed || {}),
                      financingValue: pasted,
                    },
                  },
                }));
              }}
              onChange={e => {
                const val = sanitizeNumericInput(e.target.value);
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
          <label className="field-label">Application Source</label>
          <input
            type="text"
            id="fap-form-applicationSource"
            data-field="applicationSource"
            className="field-input"
            value={draft.financingProposal?.facilityProposed?.applicationSource || ''}
            disabled={!canFinance}
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
