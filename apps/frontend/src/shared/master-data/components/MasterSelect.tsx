/** Select bound to a master-data list, used by every form field with master options. */
import {masterGroups, masterKey} from '@liugong/shared';
import {masterEntries} from '../catalog/entries';
import {useMasterData} from '../catalog/store';
import {matchesMasterItem} from '../wilayah';

export function MasterSelect({
  fieldKey,
  value,
  record,
  disabled,
  required,
  onChange,
  placeholder,
  onFocus,
}: {
  fieldKey: string;
  value: string;
  record: any;
  disabled: boolean;
  required?: boolean;
  onChange: (v: string) => void;
  placeholder?: string;
  onFocus?: () => void;
}) {
  const data = useMasterData(),
    entries = masterEntries(data, fieldKey, record) || [],
    group = masterGroups.find(g => g.key === masterKey(fieldKey))!,
    cleanVal = value === '-' || (fieldKey === 'postalCode' && value === '00000') ? '' : value,
    existing = data[group.key]?.find(x => matchesMasterItem(x, cleanVal)),
    selectedValue = existing?.value || cleanVal,
    storeName =
      group.key === 'province' || group.key === 'city' || group.key === 'district' || group.key === 'village';
  const select = (id: string) => {
    const item = entries.find(x => x.value === id) || data[group.key]?.find(x => x.value === id);
    onChange(storeName && item ? item.name : id);
  };
  const hasNone = entries.some(x => x.value.toUpperCase() === 'NONE');
  const emptyLabel =
    placeholder || (group.key === 'remarkCategoryId' ? 'Select Category' : `Select ${group.name}`);
  return (
    <select
      className={selectedValue ? undefined : 'is-placeholder'}
      required={required}
      disabled={disabled}
      value={selectedValue}
      onFocus={onFocus}
      onChange={e => select(e.target.value)}
    >
      {/* With its own "None" item the placeholder is not a choice: only shown while nothing is picked.
          Lists without "None" keep it selectable, as the way to clear an optional field. */}
      <option value="" disabled={hasNone} hidden={hasNone}>
        {emptyLabel}
      </option>
      {selectedValue && !entries.some(x => x.value === selectedValue) && (
        <option value={selectedValue}>
          {existing?.name || value}
          {existing && !existing.active ? ' · Inactive' : ''}
        </option>
      )}
      {entries.map(x => (
        <option key={x.value} value={x.value}>
          {x.name}
        </option>
      ))}
    </select>
  );
}
