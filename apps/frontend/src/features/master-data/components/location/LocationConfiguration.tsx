/** Indonesian Region tab: province → city → district → village editor. */
import {MasterItemDialog, useMasterData} from '@/shared/master-data';
import type {MasterItem} from '@liugong/shared';
import {ChevronRight, MapPin, Plus, Search} from 'lucide-react';
import {useState} from 'react';
import {LOCATION_LEVELS, useLocationLevels} from '../../hooks/useLocationLevels';
import {LocationColumn} from './LocationColumn';
import {LocationCountryPicker} from './LocationCountryPicker';

export function LocationConfiguration() {
  const data = useMasterData();
  const {countries, country, levels, select, selectCountry} = useLocationLevels(data);
  const [editing, setEditing] = useState<{key: string; item?: MasterItem; parent?: string} | null>(null);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  return (
    <div className="location-config">
      <div className="location-config-toolbar">
        <div>
          <span className="location-eyebrow">
            <MapPin size={14} />
            INDONESIAN REGION
          </span>
          <h3>Indonesian Region</h3>
          <p>Select regions from left to right to manage nested location data.</p>
        </div>
        <LocationCountryPicker
          countries={countries}
          country={country}
          onChange={selectCountry}
          onEdit={() => setEditing({key: 'country', item: country})}
          onAdd={() => setEditing({key: 'country'})}
        />
      </div>
      <div className="location-config-controls">
        <div className="location-breadcrumb">
          {[country, ...levels.map(x => x.selected)].filter(Boolean).map((x, i) => (
            <span key={i}>
              {i > 0 && <ChevronRight size={12} />}
              <b>{x?.name}</b>
            </span>
          ))}
        </div>
        <div className="location-search">
          <Search size={14} />
          <input
            aria-label="Search region"
            placeholder="Search region..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <label className="checkbox">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
          Show inactive
        </label>
      </div>
      <div className="location-columns">
        {levels.map((level, index) => (
          <LocationColumn
            key={level.key}
            level={level}
            index={index}
            search={search}
            showInactive={showInactive}
            postalCodes={data.postalCode}
            onSelect={value => select(level.key, value)}
            onAdd={() => setEditing({key: level.key, parent: level.parent?.value})}
            onEdit={item => setEditing({key: level.key, item, parent: level.parent?.value})}
          />
        ))}
      </div>
      <div className="location-config-footer">
        <span>
          Active options are available in application forms. Use Edit to update data or deactivate regions.
        </span>
        <button
          className="button small"
          onClick={() =>
            setEditing({key: 'postalCode', parent: levels.find(x => x.key === 'city')?.selected?.value})
          }
        >
          <Plus size={14} />
          Add ZIP code
        </button>
      </div>
      {editing && (
        <MasterItemDialog
          key={editing.key + ':' + (editing.item?.value || 'new')}
          groupKey={editing.key}
          item={editing.item}
          parentValue={editing.parent}
          onClose={() => setEditing(null)}
          onSaved={item => {
            if (editing.key === 'country') selectCountry(item.value);
            else if (LOCATION_LEVELS.includes(editing.key)) select(editing.key, item.value);
          }}
        />
      )}
    </div>
  );
}
