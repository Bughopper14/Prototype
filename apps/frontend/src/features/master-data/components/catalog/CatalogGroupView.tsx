/** One master group (e.g. Legal Entity, Documents): search, table of options, add / edit / delete. */
import {useCanManageMasterData} from '@/features/master-data/hooks/useCanManageMasterData';
import {MasterItemDialog, locationGroups, saveCatalog} from '@/shared/master-data';
import {masterGroups, type MasterItem} from '@liugong/shared';
import {Pencil, Plus, Search, Trash2} from 'lucide-react';
import {useState} from 'react';

export function CatalogGroupView({groupKey, data}: {groupKey: string; data: Record<string, MasterItem[]>}) {
  const canManage = useCanManageMasterData();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<MasterItem | null | undefined>(undefined);
  const group = masterGroups.find(g => g.key === groupKey) || masterGroups[0];
  const isLocation = locationGroups.has(groupKey);
  const visible = (data[groupKey] || []).filter(x =>
    (x.name + ' ' + x.value).toLowerCase().includes(search.toLowerCase()),
  );

  async function handleDelete(item: MasterItem) {
    if (!confirm(`Delete "${item.name}" from ${group.name}?`)) return;
    const next = {...data, [groupKey]: (data[groupKey] || []).filter(x => x.value !== item.value)};
    try {
      await saveCatalog(next);
    } catch (e: any) {
      alert('Failed to delete: ' + e.message);
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
            Document types, review departments, and mandatory flags apply to new applications. Newly added
            document types also appear in existing application checklists without altering existing files.
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
                <th>NAME</th>
                {!isLocation && <th>CODE / VALUE</th>}
                {group.parent && <th>PARENT</th>}
                {groupKey === 'documents' && (
                  <>
                    <th>DEPARTMENT</th>
                    <th>MANDATORY</th>
                  </>
                )}
                <th>STATUS</th>
                {canManage && <th style={{textAlign: 'center'}}>ACTION</th>}
              </tr>
            </thead>
            <tbody>
              {visible.map(x => (
                <tr key={x.value} style={{borderBottom: '1px solid #f1f5f9'}}>
                  <td style={{fontWeight: 600, color: '#0f172a'}}>{x.name}</td>
                  {!isLocation && (
                    <td>
                      <code>{x.value}</code>
                    </td>
                  )}
                  {group.parent && (
                    <td>{data[group.parent].find(p => p.value === x.parentValue)?.name || 'All'}</td>
                  )}
                  {groupKey === 'documents' && (
                    <>
                      <td>{x.role}</td>
                      <td>{x.required ? 'Mandatory' : 'Optional'}</td>
                    </>
                  )}
                  <td>
                    <span className={'deed-validity ' + (x.active ? 'active' : 'inactive')}>
                      {x.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
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
