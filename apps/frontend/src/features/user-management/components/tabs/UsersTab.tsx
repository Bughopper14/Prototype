/** Users: list, create, edit, permissions, session timeout and force logout. */
import {PermissionsDialog} from '@/features/user-management/components/forms/PermissionsDialog';
import {SessionTimeoutForm} from '@/features/user-management/components/forms/SessionTimeoutForm';
import {UserForm} from '@/features/user-management/components/forms/UserForm';
import {call} from '@/features/user-management/lib/um-api';
import {SectionHead} from '@/features/user-management/components/ui/SectionHead';
import {AddButton} from '@/features/user-management/components/ui/AddButton';
import {SessionExpiry} from '@/features/user-management/components/ui/SessionExpiry';
import type {ReactNode} from 'react';
import type {Overview} from '@/features/user-management/lib/types';

export function UsersTab({
  data,
  act,
  setDialog,
  currentUserId,
  empty,
}: {
  data: Overview;
  act: (work: () => Promise<{message?: string} | void>) => Promise<void>;
  setDialog: (dialog: ReactNode) => void;
  currentUserId: number;
  empty: (cols: number) => ReactNode;
}) {
  return (
    <>
      <SectionHead
        icon="fa-users"
        color="#002c5f"
        title="Manage Users"
        action={
          <AddButton
            label="Tambah User"
            onClick={() =>
              setDialog(
                <UserForm
                  data={data}
                  onSave={v =>
                    act(async () => {
                      const access = Object.fromEntries(
                        Object.entries(v)
                          .filter(([k]) => k.startsWith('access_'))
                          .map(([k, role]) => [k.slice('access_'.length), role || null]),
                      );
                      const fields = Object.fromEntries(
                        Object.entries(v).filter(([k]) => !k.startsWith('access_')),
                      );
                      const created = await call('/users', 'POST', fields);
                      if (Object.values(access).some(Boolean))
                        await call(`/users/${created.id}/permissions`, 'PUT', access);
                    })
                  }
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
              <th>Username</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Position</th>
              <th>Role (Portal)</th>
              <th>Session Expiry</th>
              <th style={{minWidth: 250}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.users.length === 0 && empty(7)}
            {data.users.map(u => (
              <tr key={u.id}>
                <td>
                  <strong>{u.username}</strong>
                </td>
                <td>{u.full_name}</td>
                <td>
                  {u.email ? (
                    <a className="um-mail" href={`mailto:${u.email}`}>
                      <i className="fas fa-envelope" />
                      {u.email}
                    </a>
                  ) : (
                    <span className="um-muted">—</span>
                  )}
                </td>
                <td>
                  <span className="badge-position">{u.position || 'Staff'}</span>
                </td>
                <td>
                  {u.role_name ? (
                    <span className="badge-app">{u.role_name}</span>
                  ) : (
                    <span className="um-muted">—</span>
                  )}
                </td>
                <td>
                  <SessionExpiry minutes={u.session_timeout_minutes} />
                </td>
                <td>
                  <div className="um-actions">
                    <button
                      type="button"
                      className="um-btn warning"
                      onClick={() =>
                        setDialog(
                          <UserForm
                            user={u}
                            onSave={v => act(() => call(`/users/${u.id}`, 'PUT', v))}
                            onClose={() => setDialog(null)}
                          />,
                        )
                      }
                    >
                      <i className="fas fa-edit" />
                      Edit
                    </button>
                    <button
                      type="button"
                      className="um-btn ghost"
                      title="Set Batas Waktu Sesi (Session Expired)"
                      onClick={() =>
                        setDialog(
                          <SessionTimeoutForm
                            user={u}
                            onSave={minutes =>
                              act(() =>
                                call(`/users/${u.id}/session-timeout`, 'PUT', {
                                  timeout_minutes: minutes,
                                }),
                              )
                            }
                            onClose={() => setDialog(null)}
                          />,
                        )
                      }
                    >
                      <i className="fas fa-stopwatch" />
                      Session
                    </button>
                    <button
                      type="button"
                      className="um-btn outline"
                      onClick={() =>
                        setDialog(
                          <PermissionsDialog
                            userId={u.id}
                            name={u.full_name || u.username}
                            onSave={v => act(() => call(`/users/${u.id}/permissions`, 'PUT', v))}
                            onClose={() => setDialog(null)}
                          />,
                        )
                      }
                    >
                      <i className="fas fa-lock" />
                      Access
                    </button>
                    <button
                      type="button"
                      className="um-btn danger-outline"
                      title="Keluarkan Paksa Sesi User"
                      onClick={() =>
                        confirm(`Keluarkan paksa sesi ${u.username}?`) &&
                        act(() => call(`/users/${u.id}/force-logout`, 'POST', {}))
                      }
                    >
                      <i className="fas fa-power-off" />
                      Logout
                    </button>
                    {u.id !== currentUserId && (
                      <button
                        type="button"
                        className="um-btn danger"
                        aria-label={`Hapus ${u.username}`}
                        onClick={() =>
                          confirm(`Hapus user ${u.username}?`) && act(() => call(`/users/${u.id}`, 'DELETE'))
                        }
                      >
                        <i className="fas fa-trash" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
