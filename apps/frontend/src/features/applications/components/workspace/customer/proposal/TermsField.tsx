/** One free-text field of a Terms & Conditions column. */
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
  const {draft, setDraft, handleTriggerFieldSync, canFinance} = useWorkspace();
  const terms = draft.financingProposal?.[group] as Record<string, string> | undefined;
  const rawValue = (field.readKeys || [field.key]).map(k => terms?.[k]).find(Boolean) || '';
  const value = field.normalizeValue ? field.normalizeValue(rawValue) : rawValue;
  const updateValue = (val: string) => {
    const patch = Object.fromEntries([field.key, ...(field.alsoWrite || [])].map(k => [k, val]));
    setDraft((prev: any) => ({
      ...prev,
      financingProposal: {
        ...(prev.financingProposal || {}),
        [group]: {...(prev.financingProposal?.[group] || {}), ...patch},
      },
    }));
  };
  const sharedProps = {
    id: `fap-form-${field.dataField}`,
    'data-field': field.dataField,
    className: 'field-input',
    style: {width: '100%', boxSizing: 'border-box'} as const,
    disabled: !canFinance,
    onFocus: () => handleTriggerFieldSync(field.dataField, 'proposal'),
  };
  return (
    <div className="field-group" data-field={field.dataField}>
      <label className="field-label" style={LABEL_STYLE}>
        {field.label}
      </label>
      {field.options ? (
        <select {...sharedProps} value={value} onChange={e => updateValue(e.target.value)}>
          <option value="">-- Select --</option>
          {field.options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input type="text" {...sharedProps} value={value} onChange={e => updateValue(e.target.value)} />
      )}
    </div>
  );
}
