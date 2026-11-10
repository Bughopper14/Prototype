/** Roles and the authorities each one grants. */
import {RoleForm} from '@/features/user-management/components/forms/RoleForm';
import {call} from '@/features/user-management/lib/um-api';
import {SectionHead} from '@/features/user-management/components/ui/SectionHead';
import {AddButton} from '@/features/user-management/components/ui/AddButton';
import type {ReactNode} from 'react';
import type {Overview} from '@/features/user-management/lib/types';

export function RolesTab({
  data,
  act,
  setDialog,
  authoritiesByRole,
  empty,
}: {
  data: Overview;
  act: (work: () => Promise<{message?: string} | void>) => Promise<void>;
  setDialog: (dialog: ReactNode) => void;
  authoritiesByRole: Map<number, number[]>;
  empty: (cols: number) => ReactNode;
}) {
  return (
    <>
      <SectionHead
        icon="fa-user-tag"
        color="#198754"
        title="Manage Roles"
        extra={<span className="um-pill success">{data.roles.length} Roles</span>}
        action={
          <AddButton
            label="Tambah Role"
            onClick={() =>
              setDialog(
                <RoleForm
                  data={data}
                  onSave={v => act(() => call('/roles', 'POST', v))}
                  onClose={() => setDialog(null)}
                />,
              )
            }
          />
        }
      />
      <div className="um-table-wrap">
        <table className="um-table">
          <thead>
            <tr>
              <th>Role Name</th>
              <th>App</th>
              <th>Authorities</th>
              <th style={{width: 100}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.roles.length === 0 && empty(4)}
            {data.roles.map(r => {
              const ids = authoritiesByRole.get(r.id) || [];
              return (
                <tr key={r.id}>
                  <td>
                    <div style={{display: 'flex', alignItems: 'center', gap: 4}}>
                      <strong>{r.role_name}</strong>
                      <span className="um-pill primary" title="Jumlah otoritas yang diset untuk role ini">
                        {ids.length} otoritas
                      </span>
                    </div>
                    {r.description && <div className="um-muted">{r.description}</div>}
                  </td>
                  <td>
                    <span className="badge-app">{r.app_name}</span>
                  </td>
                  <td>
                    <div className="um-muted" style={{fontWeight: 600, marginBottom: 4}}>
                      <i className="fas fa-check-circle" style={{color: '#198754', marginRight: 4}} />
                      {ids.length} otoritas aktif:
                    </div>
                    {ids.map(id => {
                      const auth = data.authorities.find(x => x.id === id);
                      return auth ? (
                        <span key={id} className="badge-auth">
                          {auth.authority_name}
                        </span>
                      ) : null;
                    })}
                  </td>
                  <td>
                    <div className="um-actions">
                      <button
                        type="button"
                        className="um-btn warning"
                        aria-label={`Edit ${r.role_name}`}
                        onClick={() =>
                          setDialog(
                            <RoleForm
                              data={data}
                              role={r}
                              selected={ids}
                              onSave={v => act(() => call(`/roles/${r.id}`, 'PUT', v))}
                              onClose={() => setDialog(null)}
                            />,
                          )
                        }
                      >
                        <i className="fas fa-edit" />
                      </button>
                      <button
                        type="button"
                        className="um-btn danger"
                        aria-label={`Hapus ${r.role_name}`}
                        onClick={() =>
                          confirm(`Hapus role ${r.role_name}?`) && act(() => call(`/roles/${r.id}`, 'DELETE'))
                        }
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
