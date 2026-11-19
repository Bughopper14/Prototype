/** Master Data page body: header with the catalog menu, then the selected tab (regions or a master group). */
import {useMasterData} from '@/shared/master-data';
import {masterGroups} from '@liugong/shared';
import {Menu} from 'lucide-react';
import {useState} from 'react';
import {CatalogGroupView} from './catalog/CatalogGroupView';
import {CatalogMenuDrawer} from './catalog/CatalogMenuDrawer';
import {MasterApprovals} from '@/features/master-approval/MasterApprovalPage';
import {LocationConfiguration} from './location/LocationConfiguration';

function categoryTitle(selected: string) {
  if (selected === 'location') return 'Indonesian Region';
  if (selected === 'master-approval') return 'Master Approval';
  return (masterGroups.find(g => g.key === selected) || masterGroups[0]).name;
}

export function MasterDataWorkspace() {
  const data = useMasterData();
  const [selected, setSelected] = useState(masterGroups[0].key);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <section className="panel master-page" style={{width: '100%', overflow: 'visible'}}>
      <div
        className="panel-head"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
          padding: '14px 32px',
          // always visible: the catalog button stays reachable while a long list scrolls (below the sticky app header)
          position: 'sticky',
          top: 58,
          zIndex: 80,
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          borderRadius: '16px 16px 0 0',
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
      ) : selected === 'master-approval' ? (
        <MasterApprovals />
      ) : (
        // keyed so search and the open dialog reset when switching groups
        <CatalogGroupView key={selected} groupKey={selected} data={data} />
      )}
    </section>
  );
}
