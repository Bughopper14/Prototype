/** Slide-in catalog menu: pick Field Mandatory, Indonesian Region or one of the master groups. */
import {useMandatoryRules} from '@/shared/master-data';
import {masterGroups, type MasterItem} from '@liugong/shared';
import {MapPin, Menu, Search, Settings2, X} from 'lucide-react';
import {useState, type ReactNode} from 'react';
import {createPortal} from 'react-dom';

function MenuItem({active, onClick, children}: {active: boolean; onClick: () => void; children: ReactNode}) {
  return (
    <button type="button" className={`master-burger-item ${active ? 'active' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

export function CatalogMenuDrawer({
  data,
  selected,
  onSelect,
  onClose,
}: {
  data: Record<string, MasterItem[]>;
  selected: string;
  onSelect: (key: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const mandatoryRules = useMandatoryRules();
  const q = search.toLowerCase();

  return createPortal(
    <div className="master-burger-scrim" onClick={onClose}>
      <aside
        className="master-burger-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Master Data Catalog"
        onClick={e => e.stopPropagation()}
      >
        <div className="master-burger-drawer-head">
          <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <Menu size={18} color="#002060" />
            <h3 style={{margin: 0, fontSize: 15, fontWeight: 700, color: '#002060'}}>Master Data Catalog</h3>
          </div>
          <button type="button" className="master-burger-close-btn" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <div className="master-burger-drawer-search">
          <Search size={14} color="#64748b" />
          <input
            placeholder="Search master catalog..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="master-burger-drawer-content" role="navigation">
          {/* FORM RULES */}
          {(!search || 'field mandatory form rules fap pre'.includes(q)) && (
            <div className="master-burger-group">
              <h4>FORM RULES</h4>
              <MenuItem active={selected === 'master_mandatory'} onClick={() => onSelect('master_mandatory')}>
                <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                  <Settings2 size={15} color="#002060" />
                  <span>Field Mandatory</span>
                </div>
                <span className="master-burger-badge mandatory">
                  {mandatoryRules.filter(x => x.mandatory).length} / {mandatoryRules.length}
                </span>
              </MenuItem>
            </div>
          )}

          {/* LOKASI */}
          {(!search || 'indonesian region lokasi location country province city wilayah'.includes(q)) && (
            <div className="master-burger-group">
              <h4>INDONESIAN REGION</h4>
              <MenuItem active={selected === 'location'} onClick={() => onSelect('location')}>
                <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                  <MapPin size={15} color="#002060" />
                  <span>Indonesian Region</span>
                </div>
              </MenuItem>
            </div>
          )}

          {/* OTHER GROUPS: LEGAL, ADDRESS, CUSTOMER, etc. */}
          {[...new Set(masterGroups.map(x => x.section))].map(section => {
            const items = masterGroups
              .filter(x => x.section === section)
              .filter(g => !search || g.name.toLowerCase().includes(q) || section.toLowerCase().includes(q));
            if (!items.length) return null;
            return (
              <div key={section} className="master-burger-group">
                <h4>{section}</h4>
                {items.map(g => (
                  <MenuItem key={g.key} active={selected === g.key} onClick={() => onSelect(g.key)}>
                    <span>{g.name}</span>
                    <span className="master-burger-badge">
                      {data[g.key]?.filter(x => x.active).length || 0}
                    </span>
                  </MenuItem>
                ))}
              </div>
            );
          })}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
