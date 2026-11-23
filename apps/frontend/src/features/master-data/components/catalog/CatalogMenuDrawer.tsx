/** Slide-in catalog menu: pick Indonesian Region or one of the master groups. */
import {masterGroups, type MasterItem} from '@liugong/shared';
import {useCrm} from '@/features/crm/components/CrmProvider';
import {hasAuthority} from '@/shared/lib/auth';
import {MapPin, Menu, Search, ShieldCheck, X} from 'lucide-react';
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
  const {user} = useCrm();
  // Master Approval is a category of its own: whoever holds its view authority sees it
  const canApprovals = hasAuthority(user, 'CRM_MASTER-APPROVAL_VIEW');
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

          {/* APPROVAL: the approvals a workflow points at (administrators only) */}
          {canApprovals && (!search || 'master approval approval authority level persetujuan workflow'.includes(q)) && (
            <div className="master-burger-group">
              <h4>APPROVAL</h4>
              <MenuItem active={selected === 'master-approval'} onClick={() => onSelect('master-approval')}>
                <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                  <ShieldCheck size={15} color="#002060" />
                  <span>Master Approval</span>
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
