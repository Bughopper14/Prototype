/** Country dropdown with edit / add buttons, top right of the region editor. */
import {useCanManageMasterData} from '@/features/master-data/hooks/useCanManageMasterData';
import type {MasterItem} from '@liugong/shared';
import {Pencil, Plus} from 'lucide-react';

export function LocationCountryPicker({
  countries,
  country,
  onChange,
  onEdit,
  onAdd,
}: {
  countries: MasterItem[];
  country?: MasterItem;
  onChange: (value: string) => void;
  onEdit: () => void;
  onAdd: () => void;
}) {
  const canManage = useCanManageMasterData();
  return (
    <div className="location-country">
      <label>
        Country
        <select
          aria-label="Country location"
          value={country?.value || ''}
          onChange={e => onChange(e.target.value)}
        >
          <option value="" hidden></option>
          {countries.map(x => (
            <option key={x.value} value={x.value}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      {canManage && (
        <>
          <button className="button small" aria-label="Edit country" disabled={!country} onClick={onEdit}>
            <Pencil size={14} />
          </button>
          <button className="button small" onClick={onAdd}>
            <Plus size={14} />
            Country
          </button>
        </>
      )}
    </div>
  );
}
