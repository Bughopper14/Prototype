/** Select bound to a master-data list, used by every form field with master options. */
import {masterGroups, masterKey} from '@liugong/shared';
import {compareLabels, masterEntries} from '../catalog/entries';
import {useMasterData} from '../catalog/store';
import {matchesMasterItem} from '../wilayah';

export function MasterSelect({
  fieldKey,
  value,
  record,
  disabled,
  required,
  onChange,
  onFocus,
}: {
  fieldKey: string;
  value: string;
  record: any;
  disabled: boolean;
  required?: boolean;
  onChange: (v: string) => void;
  onFocus?: () => void;
}) {
  const data = useMasterData(),
    entries = masterEntries(data, fieldKey, record) || [],
    group = masterGroups.find(g => g.key === masterKey(fieldKey))!,
    // A stored value may be the master value or (from OCR) a name; either selects the master item.
    existing = data[group.key]?.find(x => matchesMasterItem(x, value)),
    selectedValue = existing?.value || value;
  // Every master field stores the master value (codes; ids for province / city / district / village).
  const select = (id: string) => onChange(id);
  const choices = [...entries].sort((a, b) => compareLabels(a.name, b.name));
  return (
    <select
      required={required}
      disabled={disabled}
      value={selectedValue}
      onFocus={onFocus}
      onChange={e => select(e.target.value)}
    >
      <option value="" hidden></option>
      {selectedValue && !choices.some(x => x.value === selectedValue) && (
        <option value={selectedValue}>
          {existing?.name || value}
          {existing && !existing.active ? ' · Inactive' : ''}
        </option>
      )}
      {choices.map(x => (
        <option key={x.value} value={x.value}>
          {x.name}
        </option>
      ))}
    </select>
  );
}
