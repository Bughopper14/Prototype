/** Master Data page body: header with the catalog menu, then the selected tab (mandatory rules, regions or a group). */
import {useCanManageMasterData} from '@/features/master-data/hooks/useCanManageMasterData';
import {useMasterData} from '@/shared/master-data';
import {masterGroups} from '@liugong/shared';
import {Menu} from 'lucide-react';
import {useState} from 'react';
import {CatalogGroupView} from './catalog/CatalogGroupView';
import {CatalogMenuDrawer} from './catalog/CatalogMenuDrawer';
import {LocationConfiguration} from './location/LocationConfiguration';
import {MasterMandatoryView} from './mandatory/MandatoryRulesView';

function categoryTitle(selected: string) {
  if (selected === 'master_mandatory') return 'Field Mandatory (FAP & PRE-AN)';
  if (selected === 'location') return 'Indonesian Region';
  return (masterGroups.find(g => g.key === selected) || masterGroups[0]).name;
}

export function MasterDataWorkspace() {
  const data = useMasterData();
  const canManage = useCanManageMasterData();
  const [selected, setSelected] = useState('master_mandatory');
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <section className="panel master-page" style={{width: '100%'}}>
      <div
        className="panel-head"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
          padding: '18px 32px',
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12}}>
          <button
            type="button"
            className="master-burger-toggle-btn"
            onClick={() => setMenuOpen(true)}
            title="Click to open master data catalog menu"
          >
            <Menu size={18} />
            <span>Master Data Catalog</span>
          </button>

          <div className="master-selected-indicator">
            <span className="master-selected-label">Active Category:</span>
            <span className="master-selected-chip">{categoryTitle(selected)}</span>
          </div>
        </div>
      </div>

      {menuOpen && (
        <CatalogMenuDrawer
          data={data}
          selected={selected}
          onSelect={key => {
            setSelected(key);
            setMenuOpen(false);
          }}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {selected === 'location' ? (
        <LocationConfiguration />
      ) : selected === 'master_mandatory' ? (
        <div className="master-page-layout">
          <MasterMandatoryView canManage={canManage} />
        </div>
      ) : (
        // keyed so search and the open dialog reset when switching groups
        <CatalogGroupView key={selected} groupKey={selected} data={data} />
      )}
    </section>
  );
}
