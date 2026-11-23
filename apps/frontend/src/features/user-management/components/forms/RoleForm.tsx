/** Create / edit role dialog with its authorities. */
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
  const [selectedIds, setSelectedIds] = useState<number[]>(() => [...selected]);
  const [search, setSearch] = useState('');

  const appAuthorities = useMemo(() => {
    return data.authorities.filter(a => a.app_id === appId);
  }, [data.authorities, appId]);

  const filteredAuthorities = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return appAuthorities;
    return appAuthorities.filter(
      a =>
        a.authority_name.toLowerCase().includes(q) ||
        (a.description && a.description.toLowerCase().includes(q)),
    );
  }, [appAuthorities, search]);

  const allFilteredSelected =
    filteredAuthorities.length > 0 &&
    filteredAuthorities.every(a => selectedIds.includes(a.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredSet = new Set(filteredAuthorities.map(a => a.id));
      setSelectedIds(prev => prev.filter(id => !filteredSet.has(id)));
    } else {
      const next = new Set(selectedIds);
      filteredAuthorities.forEach(a => next.add(a.id));
      setSelectedIds(Array.from(next));
    }
  };

  const toggleAuthority = (id: number) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
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
          authorities: selectedIds,
        })
      }
    >
      {!role && (
        <label className="pt-field">
          <span className="pt-form-label">Application</span>
          <select className="pt-select" value={appId} onChange={e => setAppId(Number(e.target.value))}>
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
      <div className="pt-field">
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6}}>
          <span className="pt-form-label" style={{margin: 0, display: 'flex', alignItems: 'center', gap: 8}}>
            Authorities
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#002C5F',
                backgroundColor: '#EFF6FF',
                padding: '2px 8px',
                borderRadius: 12,
                border: '1px solid #DBEAFE',
              }}
            >
              {selectedIds.length} selected
            </span>
          </span>
          {filteredAuthorities.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAll}
              style={{
                background: 'none',
                border: 'none',
                color: '#0284c7',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {allFilteredSelected ? 'Deselect All' : `Select All (${filteredAuthorities.length})`}
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div style={{position: 'relative', marginBottom: 8}}>
          <i
            className="fas fa-search"
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              fontSize: 12,
            }}
          />
          <input
            type="text"
            placeholder="Search authorities by code or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 28px 7px 30px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              fontFamily: "'Outfit', sans-serif",
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: 2,
                fontSize: 11,
              }}
              title="Clear search"
            >
              <i className="fas fa-times" />
            </button>
          )}
        </div>

        {/* Checkbox List */}
        <div className="pt-checks" style={{maxHeight: 220, overflowY: 'auto'}}>
          {filteredAuthorities.length === 0 ? (
            <div style={{padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: 12}}>
              Tidak ada authority yang cocok dengan "{search}"
            </div>
          ) : (
            filteredAuthorities.map(a => {
              const isChecked = selectedIds.includes(a.id);
              return (
                <label
                  key={a.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '4px 6px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    userSelect: 'none',
                    background: isChecked ? '#f8fafc' : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleAuthority(a.id)}
                    style={{margin: 0, accentColor: '#002C5F', cursor: 'pointer'}}
                  />
                  <span style={{fontWeight: isChecked ? 600 : 400, color: isChecked ? '#002C5F' : '#1e293b', fontSize: 13}}>
                    {a.authority_name}
                  </span>
                  {a.description && (
                    <small
                      style={{
                        color: '#64748b',
                        fontSize: 11,
                        marginLeft: 'auto',
                        textAlign: 'right',
                        maxWidth: '45%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={a.description}
                    >
                      {a.description}
                    </small>
                  )}
                </label>
              );
            })
          )}
        </div>
      </div>
    </Dialog>
  );
}
