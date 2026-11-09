/** Stakeholder form fields (left pane). */
import {Fields} from '@/shared/ui/Fields';

import {useStakeholderModalContext} from '@/features/legal/components/stakeholder-modal/StakeholderModalContext';
import {FOREIGN_REGION_KEYS, isForeignAddress} from '@/features/legal/lib/stakeholder-values';

export function StakeholderFields() {
  const {editorLocked, onChangeValue, fields, activeIdGroup, formValue, handleSelectOption} =
    useStakeholderModalContext();
  const foreign = isForeignAddress(formValue);
  return (
    <Fields
      fields={fields.map(f => {
        if (f.key === 'idType') {
          return {
            ...f,
            options: ['NONE', 'KTP_NPWP', 'PASSPORT_KITAS'],
            optionLabels: {
              NONE: 'None',
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
      disabled={editorLocked}
      onChange={onChangeValue}
      onSelectOption={handleSelectOption}
    />
  );
}
