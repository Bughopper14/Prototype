/** Stakeholder form fields (left pane). */
import {Fields} from '@/shared/ui/Fields';

import {useStakeholderModalContext} from '@/features/legal/components/stakeholder-modal/StakeholderModalContext';
import {FOREIGN_REGION_KEYS, isForeignAddress} from '@/features/legal/lib/stakeholder-values';

export function StakeholderFields() {
  const {
    editorLocked,
    onChangeValue,
    fields,
    activeIdGroup,
    formValue,
    handleSelectOption,
    roundedTotal,
    roundedOther,
    isShareExceeded,
    maxAvailableShare,
    shareCustomErrors,
  } = useStakeholderModalContext();
  const foreign = isForeignAddress(formValue);
  const shareChip = (
    <span
      className="subtle-chip"
      title={`Pemegang saham lain: ${roundedOther.toFixed(2)}% | Total akta: ${roundedTotal.toFixed(2)}%`}
      style={{
        fontSize: '11px',
        fontWeight: isShareExceeded ? 700 : 600,
        padding: '2px 8px',
        borderRadius: '12px',
        background: isShareExceeded ? '#fef2f2' : roundedTotal === 100 ? '#f0fdf4' : '#f8fafc',
        color: isShareExceeded ? '#b91c1c' : roundedTotal === 100 ? '#15803d' : '#0369a1',
        border: `1px solid ${isShareExceeded ? '#fecaca' : roundedTotal === 100 ? '#bbf7d0' : '#bae6fd'}`,
      }}
    >
      {isShareExceeded
        ? `${roundedTotal.toFixed(2)}% · Exceeds 100%`
        : roundedTotal === 100
          ? '✓ Total 100.00%'
          : `Total: ${roundedTotal.toFixed(2)}% / 100%`}
    </span>
  );
  const shareFooter =
    !isShareExceeded && roundedOther > 0 ? (
      <small
        style={{color: '#64748b', fontSize: '10.5px', marginTop: '3px', display: 'block', lineHeight: 1.3}}
      >
        Pemegang saham lain pada akta ini: <strong>{roundedOther.toFixed(2)}%</strong> · Kuota tersedia:{' '}
        <strong>{maxAvailableShare.toFixed(2)}%</strong>
      </small>
    ) : null;
  return (
    <Fields
      fields={fields.map(f => {
        if (f.key === 'idType') {
          return {
            ...f,
            options: ['KTP_NPWP', 'PASSPORT_KITAS'],
            optionLabels: {
              KTP_NPWP: 'KTP - NPWP',
              PASSPORT_KITAS: 'PASSPORT - KITAS',
            },
          };
        }
        if (f.key === 'idNumber') {
          return {
            ...f,
            label:
              activeIdGroup === 'KTP_NPWP'
                ? 'ID Number - KTP'
                : activeIdGroup === 'PASSPORT_KITAS'
                  ? 'ID Number - PASSPORT'
                  : 'ID Number - [KTP or PASSPORT]',
          };
        }
        if (f.key === 'idNumberSecondary') {
          return {
            ...f,
            label:
              activeIdGroup === 'KTP_NPWP'
                ? 'ID Number - NPWP'
                : activeIdGroup === 'PASSPORT_KITAS'
                  ? 'ID Number - KITAS'
                  : 'ID Number - [NPWP or KITAS]',
          };
        }
        if (foreign && FOREIGN_REGION_KEYS.includes(f.key)) {
          // Always "Others" and locked: the Indonesian region lists do not apply to a foreigner
          return {...f, master: false, required: false, locked: true};
        }
        return f;
      })}
      value={formValue}
      section="Shareholders & Management"
      disabled={editorLocked}
      onChange={onChangeValue}
      onSelectOption={handleSelectOption}
      customErrors={shareCustomErrors}
      customFieldHeaders={{sharePercentage: shareChip}}
      customFieldFooters={shareFooter ? {sharePercentage: shareFooter} : undefined}
    />
  );
}
