/** One field of a Terms & Conditions column: free text, or a pick from a master-data list when the field names one. */
import {RequiredStar} from '@/shared/ui/RequiredStar';
import {useMasterData} from '@/shared/master-data';
import {useEffect} from 'react';
import {useWorkspace} from '@/features/applications/components/workspace/WorkspaceContext';
import type {
  TermsFieldConfig,
  TermsGroupKey,
} from '@/features/applications/components/workspace/customer/proposal/terms-config';
import {FORM_SECTION} from '@liugong/shared';

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
  const master = useMasterData();
  const raw = terms?.[field.key] || '';
  // a field tied to a master list can only be picked (the master code is what is saved)
  const choices = field.master
    ? (master[field.master] || []).filter((x: any) => x.active !== false).map((x: any) => ({value: String(x.value), label: String(x.name || x.value)}))
    : null;
  // an older value written another way ("IN_ARREAR", "in arrear") is matched to its master code instead of being lost
  const loose = (v: string) => v.toLowerCase().replace(/[\s_-]+/g, '');
  const value = choices ? (choices.find(c => c.value === raw) || choices.find(c => loose(c.value) === loose(raw) || loose(c.label) === loose(raw)))?.value ?? raw : raw;
  const update = (val: string) => {
    const patch = {[field.key]: val};
    setDraft((prev: any) => ({
      ...prev,
      financingProposal: {
        ...(prev.financingProposal || {}),
        [group]: {...(prev.financingProposal?.[group] || {}), ...patch},
      },
    }));
  };
  // the older spelling is replaced by the master code in the draft too, so what is saved is the code
  useEffect(() => {
    if (choices && canProposal && raw && value !== raw) update(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, value]);
  return (
    <div className="field-group" data-field={field.dataField}>
      <label className="field-label" style={LABEL_STYLE}>
        {field.label}
        <RequiredStar field={field.dataField} section={FORM_SECTION.PROPOSAL} />
      </label>
      {choices ? (
        <select
          id={`fap-form-${field.dataField}`}
          data-field={field.dataField}
          className="field-input"
          value={value}
          disabled={!canProposal}
          onFocus={() => handleTriggerFieldSync(field.dataField, 'proposal')}
          onChange={e => update(e.target.value)}
        >
          <option value="" disabled hidden>
            Select…
          </option>
          {choices.map(c => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
          {value && !choices.some(c => c.value === value) && <option value={value}>{value} (not in master data)</option>}
        </select>
      ) : (
        <input
          type="text"
          id={`fap-form-${field.dataField}`}
          data-field={field.dataField}
          className="field-input"
          value={value}
          disabled={!canProposal}
          onFocus={() => handleTriggerFieldSync(field.dataField, 'proposal')}
          onChange={e => update(e.target.value)}
        />
      )}
    </div>
  );
}
