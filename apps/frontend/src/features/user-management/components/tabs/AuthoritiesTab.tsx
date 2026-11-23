/** Authorities (permission codes). */
import {AuthorityForm} from '@/features/user-management/components/forms/AuthorityForm';
import {call} from '@/features/user-management/lib/um-api';
import {SectionHead} from '@/features/user-management/components/ui/SectionHead';
import {AddButton} from '@/features/user-management/components/ui/AddButton';
import type {ReactNode} from 'react';
import type {Overview} from '@/features/user-management/lib/types';

export function AuthoritiesTab({
  data,
  act,
  setDialog,
  empty,
}: {
  data: Overview;
  act: (work: () => Promise<{message?: string} | void>) => Promise<void>;
  setDialog: (dialog: ReactNode) => void;
  empty: (cols: number) => ReactNode;
}) {
  return (
    <>
      <SectionHead
        icon="fa-key"
        color="#ff9900"
        title="Authorities (Permissions)"
        extra={
          <span className="um-pill primary">
            <i className="fas fa-shield-alt" />
            Total: {data.authorities.length} Authorities
          </span>
        }
        action={
          <AddButton
            label="Add Authority"
            onClick={() =>
              setDialog(
                <AuthorityForm
                  data={data}
                  onSave={v => act(() => call('/authorities', 'POST', v))}
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
              <th style={{width: 50, textAlign: 'center'}}>#</th>
              <th>Authority Code</th>
              <th>Application</th>
              <th>Description</th>
              <th style={{width: 100}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.authorities.length === 0 && empty(5)}
            {data.authorities.map((a, i) => {
              const connectedRoles = (data.roles || []).filter(r =>
                (data.roleAuthorities || []).some(ra => ra.role_id === r.id && ra.authority_id === a.id),
              );
              return (
                <tr key={a.id}>
                  <td style={{textAlign: 'center', fontWeight: 700, color: '#94a3b8'}}>{i + 1}</td>
                  <td>
                    <code>{a.authority_name}</code>
                  </td>
                  <td>
                    <span className="badge-app">{a.app_name}</span>
                  </td>
                  <td>
                    <span className="um-muted">{a.description}</span>
                  </td>
                  <td>
                    <div className="um-actions">
                      <button
                        type="button"
                        className="um-btn warning"
                        aria-label={`Edit ${a.authority_name}`}
                        onClick={() =>
                          setDialog(
                            <AuthorityForm
                              data={data}
                              authority={a}
                              onSave={v => act(() => call(`/authorities/${a.id}`, 'PUT', v))}
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
                        aria-label={`Delete ${a.authority_name}`}
                        title={
                          connectedRoles.length > 0
                            ? `Tidak dapat dihapus: masih dipakai ${connectedRoles.length} role (${connectedRoles.map(r => r.role_name).join(', ')})`
                            : `Hapus authority "${a.authority_name}"`
                        }
                        onClick={() => {
                          if (connectedRoles.length > 0) {
                            alert(
                              `Tidak dapat menghapus authority "${a.authority_name}" karena masih dipakai oleh role:\n\n• ${connectedRoles.map(r => r.role_name).join('\n• ')}\n\nSilakan lepas authority ini dari role terkait terlebih dahulu.`,
                            );
                            return;
                          }
                          if (window.confirm(`Yakin ingin menghapus authority "${a.authority_name}"?`)) {
                            act(() => call(`/authorities/${a.id}`, 'DELETE'));
                          }
                        }}
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
