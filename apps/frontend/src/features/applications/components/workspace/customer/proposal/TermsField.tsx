/** One field of a Terms & Conditions column: free text, or a pick from options/master-data. */
import {RequiredStar} from '@/shared/ui/RequiredStar';
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import type {
  TermsFieldConfig,
  TermsGroupKey,
} from '@/features/applications/components/workspace/customer/proposal/terms-config';

const LABEL_STYLE = {
  fontSize: '11px',
  minHeight: '28px',
  display: 'flex',
  alignItems: 'flex-end',
  lineHeight: 1.25,
  marginBottom: '4px',
  fontWeight: 600,
  color: '#475569',
} as const;

export function TermsField({group, field}: {group: TermsGroupKey; field: TermsFieldConfig}) {
  const {draft, setDraft, handleTriggerFieldSync, canProposal} = useWorkspace();
  const terms = draft.financingProposal?.[group] as Record<string, string> | undefined;

  let value = '';
  const keysToTry = field.readKeys || [field.key];
  for (const k of keysToTry) {
    if (terms?.[k] !== undefined && terms?.[k] !== null && String(terms[k]).trim() !== '') {
      value = String(terms[k]);
      break;
    }
  }

  // Fallback for unassigned state: check if any group had a value
  if (!value && group === ('termsUnassigned' as any)) {
    const prop = draft.financingProposal || {};
    for (const g of ['termsFinancialLease', 'termsSaleAndLeaseBack', 'termsInstallmentFinancing'] as const) {
      const gTerms = prop[g] as Record<string, string> | undefined;
      for (const k of keysToTry) {
        if (gTerms?.[k] !== undefined && gTerms?.[k] !== null && String(gTerms[k]).trim() !== '') {
          value = String(gTerms[k]);
          break;
        }
      }
      if (value) break;
    }
  }

  // Fallback for currency: if empty in terms, fall back to facilityProposed currencyChoice
  if (!value && field.key === 'currency') {
    value =
      draft.financingProposal?.facilityProposed?.currencyChoice ||
      draft.proposal?.currency ||
      '';
  }

  const normalizedValue = field.normalizeValue ? field.normalizeValue(value) : value;

  const handleFieldChange = (val: string) => {
    const patch: Record<string, string> = {[field.key]: val};
    if (field.alsoWrite) {
      for (const ak of field.alsoWrite) {
        patch[ak] = val;
      }
    }
    setDraft((prev: any) => {
      const fp = prev.financingProposal || {};
      const nextFp: any = {
        ...fp,
        [group]: {...(fp[group] || {}), ...patch},
        ...(group !== ('termsUnassigned' as any)
          ? {
              termsUnassigned: {
                ...(fp.termsUnassigned || {}),
                ...patch,
              },
            }
          : {}),
      };
      if (field.key === 'currency') {
        nextFp.facilityProposed = {
          ...(nextFp.facilityProposed || {}),
          currencyChoice: val,
        };
      }
      return {
        ...prev,
        ...(field.key === 'currency' ? {proposal: {...(prev.proposal || {}), currency: val}} : {}),
        financingProposal: nextFp,
      };
    });
  };

  return (
    <div className="field-group" data-field={field.dataField} style={{display: 'flex', flexDirection: 'column', width: '100%'}}>
      <label className="field-label" style={LABEL_STYLE}>
        {field.label}
        <RequiredStar field={field.dataField} section="Financing Proposal" />
      </label>
      {field.options ? (
        <select
          id={`fap-form-${field.dataField}`}
          data-field={field.dataField}
          className="field-input"
          style={{width: '100%', boxSizing: 'border-box'}}
          value={normalizedValue}
          disabled={!canProposal}
          onFocus={() => handleTriggerFieldSync(field.dataField, 'proposal')}
          onChange={e => handleFieldChange(e.target.value)}
        >
          {field.options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
          {/* Fallback if legacy value is not present in options */}
          {value && !field.options.some(o => o.value === normalizedValue) && (
            <option value={value}>{value}</option>
          )}
        </select>
      ) : (
        <input
          type="text"
          id={`fap-form-${field.dataField}`}
          data-field={field.dataField}
          className="field-input"
          style={{width: '100%', boxSizing: 'border-box'}}
          value={value}
          disabled={!canProposal}
          onFocus={() => handleTriggerFieldSync(field.dataField, 'proposal')}
          onChange={e => handleFieldChange(e.target.value)}
        />
      )}
    </div>
  );
}
