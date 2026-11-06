/** One column (province, city, district or village) of the region editor. */
import {masterGroups, type MasterItem} from '@liugong/shared';
import {Pencil, Plus} from 'lucide-react';
import type {LocationLevel} from '../../hooks/useLocationLevels';

export function LocationColumn({
  level: {key, parent, items, selected},
  index,
  search,
  showInactive,
  postalCodes,
  onSelect,
  onAdd,
  onEdit,
}: {
  level: LocationLevel;
  index: number;
  search: string;
  showInactive: boolean;
  postalCodes: MasterItem[];
  onSelect: (value: string) => void;
  onAdd: () => void;
  onEdit: (item: MasterItem) => void;
}) {
  const title = masterGroups.find(g => g.key === key)!.name;
  const visible = items.filter(
    x => (showInactive || x.active) && x.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <section className="location-column" aria-label={title}>
      <header>
        <div>
          <span className="location-step">{index + 1}</span>
          <h4>{title}</h4>
          <span className="location-item-count">{items.filter(x => x.active).length}</span>
        </div>
        <button
          className="location-add"
          aria-label={`Add ${title}`}
          title={parent ? `Add ${title}` : 'Select parent region first'}
          disabled={!parent}
          onClick={onAdd}
        >
          <Plus size={17} />
        </button>
      </header>
      <div className="location-parent-caption">{parent?.name || 'Select parent region'}</div>
      <div className="location-column-scroll">
        <table>
          <thead>
            <tr>
              <th>NAME</th>
              {key === 'province' && <th>REGION</th>}
              {key === 'village' && <th>ZIP CODE</th>}
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.map(x => (
              <tr
                key={x.value}
                className={(selected?.value === x.value ? 'selected ' : '') + (!x.active ? 'inactive' : '')}
              >
                <td>
                  <button
                    className="location-select-row"
                    disabled={!x.active}
                    aria-pressed={selected?.value === x.value}
                    onClick={() => onSelect(x.value)}
                  >
                    <b>{x.name}</b>
                    {!x.active && <span>Inactive</span>}
                  </button>
                </td>
                {key === 'province' && <td>{x.region || '—'}</td>}
                {key === 'village' && (
                  <td>{postalCodes.find(p => p.value === x.zipCode)?.name || x.zipCode || '—'}</td>
                )}
                <td>
                  <button className="location-edit" aria-label={`Edit ${x.name}`} onClick={() => onEdit(x)}>
                    <Pencil size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <div className="location-empty">
            {!parent
              ? 'Select a region in the previous column.'
              : search
                ? 'No matching regions.'
                : `No ${title.toLowerCase()} for ${parent.name}.`}
          </div>
        )}
      </div>
    </section>
  );
}
