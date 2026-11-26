/** One master group (e.g. Legal Entity, Documents): search, table of options, add / edit / delete. */
import {useCrm} from '@/features/crm/components/CrmProvider';
import {useCanManageMasterData} from '@/features/master-data/hooks/useCanManageMasterData';
import {MasterItemDialog, currentMasterData, locationGroups, saveCatalog, setMasterData} from '@/shared/master-data';
import {masterGroups, sortableMasterGroups, type MasterItem} from '@liugong/shared';
import {GripVertical, Pencil, Plus, Search, Trash2} from 'lucide-react';
import {useRef, useState} from 'react';
import {api} from '@/shared/lib/api';

export function CatalogGroupView({groupKey, data}: {groupKey: string; data: Record<string, MasterItem[]>}) {
  const {notify, confirm} = useCrm();
  const canManage = useCanManageMasterData();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<MasterItem | null | undefined>(undefined);
  const group = masterGroups.find(g => g.key === groupKey) || masterGroups[0];
  const isLocation = locationGroups.has(groupKey);
  const sortable = sortableMasterGroups.has(groupKey);
  const visible = (data[groupKey] || [])
    .filter(x => (x.name + ' ' + x.value).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (sortable ? (a.sortOrder ?? 0) - (b.sortOrder ?? 0) : 0));

  const savingOrder = useRef(false);
  const [dragValue, setDragValue] = useState<string | null>(null);
  const [overValue, setOverValue] = useState<string | null>(null);
  const canDrag = sortable && canManage && !search;

  /** Moves the dragged item to the position of the one it is dropped on, then renumbers the list 1..n. */
  async function reorder(from: string, to: string) {
    setDragValue(null);
    setOverValue(null);
    if (from === to || savingOrder.current) return;
    savingOrder.current = true;
    const attempt = async (catalog: Record<string, MasterItem[]>) => {
      const all = [...(catalog[groupKey] || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      const i = all.findIndex(x => x.value === from);
      const j = all.findIndex(x => x.value === to);
      if (i < 0 || j < 0) return;
      all.splice(j, 0, ...all.splice(i, 1));
      await saveCatalog({...catalog, [groupKey]: all.map((x, n) => ({...x, sortOrder: n + 1}))}, groupKey);
    };
    try {
      try {
        await attempt(data);
      } catch {
        // The catalog changed since this page loaded: take the latest one and apply the move again, once.
        setMasterData(await api('/master-data'));
        await attempt(currentMasterData());
      }
    } catch (e: any) {
      notify('Failed to reorder: ' + e.message, 'error');
    } finally {
      savingOrder.current = false;
    }
  }

  async function handleDelete(item: MasterItem) {
    const ok = await confirm({
      title: `Delete "${item.name}"?`,
      message: `Remove "${item.name}" from ${group.name}? Existing options that are already stored cannot be deleted — deactivate them instead.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    const next = {...data, [groupKey]: (data[groupKey] || []).filter(x => x.value !== item.value)};
    try {
      await saveCatalog(next, groupKey);
      notify(`"${item.name}" deleted`);
    } catch (e: any) {
      notify('Failed to delete: ' + e.message, 'error');
    }
  }

  return (
    <div className="master-page-layout">
      <div className="master-content" style={{width: '100%', padding: '24px 32px', boxSizing: 'border-box'}}>
        <div className="section-title">
          <div>
            <h3 style={{fontSize: 18, color: '#002060', fontWeight: 700}}>{group.name}</h3>
            <p className="muted" style={{fontSize: 12, marginTop: 4}}>
              {canManage ? 'Manage dropdown choices for' : 'Dropdown choices for'} {group.section}.
            </p>
          </div>
          {canManage && (
            <button className="button primary small" onClick={() => setEditing(null)}>
              <Plus size={15} /> Add data
            </button>
          )}
        </div>
        {group.key === 'documents' && (
          <p className="master-help">
            This is the catalog of document types. A document shows on an application's checklist only when a
            workflow stage lists it (Workflow setup), as a default document or as one users can add.
          </p>
        )}
        <div className="search" style={{margin: '14px 0', maxWidth: 400}}>
          <Search size={16} />
          <input
            aria-label="Cari master data"
            placeholder={isLocation ? 'Search name…' : 'Search name or code…'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="table-scroll">
          <table className="data-table master-table" style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{background: '#f8fafc', borderBottom: '2px solid #e2e8f0'}}>
                {sortable && <th style={{width: 110}}>SORT</th>}
                <th>NAME</th>
                {!isLocation && <th>CODE / VALUE</th>}
                {group.parent && <th>PARENT</th>}
                {groupKey !== 'documents' && <th>STATUS</th>}
                {canManage && <th style={{textAlign: 'center'}}>ACTION</th>}
              </tr>
            </thead>
            <tbody>
              {visible.map(x => (
                <tr
                  key={x.value}
                  draggable={canDrag}
                  onDragStart={() => setDragValue(x.value)}
                  onDragOver={e => {
                    if (!canDrag || !dragValue) return;
                    e.preventDefault();
                    setOverValue(x.value);
                  }}
                  onDrop={e => {
                    e.preventDefault();
                    if (dragValue) reorder(dragValue, x.value);
                  }}
                  onDragEnd={() => {
                    setDragValue(null);
                    setOverValue(null);
                  }}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    opacity: dragValue === x.value ? 0.45 : 1,
                    boxShadow:
                      dragValue && overValue === x.value && dragValue !== x.value
                        ? 'inset 0 2px 0 #2563eb'
                        : undefined,
                  }}
                >
                  {sortable && (
                    <td style={{fontWeight: 700, color: '#64748b'}}>
                      <span style={{display: 'inline-flex', alignItems: 'center', gap: 6}}>
                        {canDrag && <span />}
                        <span style={{minWidth: 18}}>{x.sortOrder ?? '-'}</span>
                        {canDrag && (
                          <GripVertical
                            size={16}
                            aria-label={`Drag to reorder ${x.name}`}
                            style={{cursor: 'grab', color: '#94a3b8'}}
                          />
                        )}
                      </span>
                    </td>
                  )}
                  <td style={{fontWeight: 700, color: '#0f172a'}}>{x.name}</td>
                  {!isLocation && (
                    <td>
                      <code>{x.value}</code>
                    </td>
                  )}
                  {group.parent && (
                    <td>{data[group.parent].find(p => p.value === x.parentValue)?.name || 'All'}</td>
                  )}
                  {groupKey !== 'documents' && (
                    <td>
                      <span className={'deed-validity ' + (x.active ? 'active' : 'inactive')}>
                        {x.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  )}
                  {canManage && (
                    <td style={{textAlign: 'center'}}>
                      <div
                        style={{
                          display: 'inline-flex',
                          gap: 6,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <button className="button small" onClick={() => setEditing(x)}>
                          <Pencil size={13} /> Edit
                        </button>
                        <button
                          className="button small legal-delete-button"
                          onClick={() => handleDelete(x)}
                          title={`Delete ${x.name}`}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && (
            <div className="empty-small">No options yet. Click Add data to create one.</div>
          )}
        </div>
      </div>
      {editing !== undefined && (
        <MasterItemDialog
          key={groupKey}
          groupKey={groupKey}
          item={editing || undefined}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  );
}
