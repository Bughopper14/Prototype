/** Create / edit role dialog with its authorities and search filter. */
import {Dialog} from '@/features/user-management/components/ui/Dialog';
import {Field} from '@/features/user-management/components/ui/Field';
import {Overview, Row} from '@/features/user-management/lib/types';
import {useMemo, useState} from 'react';

export function RoleForm({
  data,
  role,
  selected = [],
  onSave,
  onClose,
}: {
  data: Overview;
  role?: Row;
  selected?: number[];
  onSave: (v: Row) => void;
  onClose: () => void;
}) {
  const [appId, setAppId] = useState<number>(role?.app_id ?? data.applications[0]?.id);
  const [selectedAuthIds, setSelectedAuthIds] = useState<number[]>(() => selected.map(Number));
  const [search, setSearch] = useState('');

  const appAuthorities = useMemo(() => {
    return data.authorities.filter(a => a.app_id === appId);
  }, [data.authorities, appId]);

  const filteredAuthorities = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return appAuthorities;
    return appAuthorities.filter(
      a =>
        (a.authority_name && String(a.authority_name).toLowerCase().includes(q)) ||
        (a.description && String(a.description).toLowerCase().includes(q)),
    );
  }, [appAuthorities, search]);

  const toggleAuth = (id: number) => {
    setSelectedAuthIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  };

  const selectAllVisible = () => {
    const visibleIds = filteredAuthorities.map(a => Number(a.id));
    setSelectedAuthIds(prev => Array.from(new Set([...prev, ...visibleIds])));
  };

  const deselectAllVisible = () => {
    const visibleIds = new Set(filteredAuthorities.map(a => Number(a.id)));
    setSelectedAuthIds(prev => prev.filter(id => !visibleIds.has(id)));
  };

  return (
    <Dialog
      title={role ? 'Edit Role' : 'Add Role'}
      onClose={onClose}
      onSubmit={f =>
        onSave({
          app_id: appId,
          role_name: f.get('role_name'),
          description: f.get('description'),
          authorities: selectedAuthIds,
        })
      }
    >
      {/* Hidden inputs ensure form data has all selected IDs regardless of DOM filtering */}
      {selectedAuthIds.map(id => (
        <input key={id} type="hidden" name="authorities" value={id} />
      ))}

      {!role && (
        <label className="pt-field">
          <span className="pt-form-label">Application</span>
          <select
            className="pt-select"
            value={appId}
            onChange={e => {
              setAppId(Number(e.target.value));
              setSearch('');
            }}
          >
            {data.applications.map(a => (
              <option key={a.id} value={a.id}>
                {a.app_name}
              </option>
            ))}
          </select>
        </label>
      )}
      <Field label="Role Name" name="role_name" defaultValue={role?.role_name} required />
      <Field label="Description" name="description" defaultValue={role?.description || ''} />

      <div className="pt-field" style={{marginTop: 6}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6}}>
          <span className="pt-form-label" style={{margin: 0}}>Authorities</span>
          <span style={{fontSize: '0.78rem', color: '#64748b'}}>
            <strong style={{color: '#002c5f'}}>{selectedAuthIds.length}</strong> selected
          </span>
        </div>

        {/* Search input bar */}
        <div className="pt-auth-search-box">
          <i className="fas fa-search pt-auth-search-icon" />
          <input
            type="text"
            className="pt-auth-search-input"
            placeholder="Search authority code or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="pt-auth-search-clear"
              title="Clear search"
              onClick={() => setSearch('')}
            >
              <i className="fas fa-times" />
            </button>
          )}
        </div>

        {/* Quick action buttons & count */}
        <div className="pt-auth-meta">
          <span>
            Showing <strong>{filteredAuthorities.length}</strong> of {appAuthorities.length}
          </span>
          {filteredAuthorities.length > 0 && (
            <div className="pt-auth-quick-actions">
              <button type="button" className="pt-auth-action-btn" onClick={selectAllVisible}>
                Select visible
              </button>
              <span style={{color: '#cbd5e1'}}>•</span>
              <button type="button" className="pt-auth-action-btn" onClick={deselectAllVisible}>
                Deselect visible
              </button>
            </div>
          )}
        </div>

        {/* Authorities Checklist */}
        <div className="pt-checks">
          {filteredAuthorities.length === 0 ? (
            <div className="pt-auth-empty">
              <i className="fas fa-search" style={{marginRight: 6, opacity: 0.6}} />
              No authorities match "{search}"
            </div>
          ) : (
            filteredAuthorities.map(a => {
              const isChecked = selectedAuthIds.includes(Number(a.id));
              return (
                <label
                  key={a.id}
                  className={`pt-auth-item ${isChecked ? 'is-checked' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleAuth(Number(a.id))}
                  />
                  <div className="pt-auth-item-body">
                    <span className="pt-auth-item-title">{a.authority_name}</span>
                    {a.description && (
                      <span className="pt-auth-item-desc">{a.description}</span>
                    )}
                  </div>
                </label>
              );
            })
          )}
        </div>
      </div>
    </Dialog>
  );
}
