/** Users: list, create, edit, permissions, session timeout and force logout. */
import {PermissionsDialog} from '@/features/user-management/components/forms/PermissionsDialog';
import {SessionTimeoutForm} from '@/features/user-management/components/forms/SessionTimeoutForm';
import {UserForm} from '@/features/user-management/components/forms/UserForm';
import {AssignDepartmentDialog} from '@/features/user-management/components/forms/AssignDepartmentDialog';
import {call} from '@/features/user-management/lib/um-api';
import {SectionHead} from '@/features/user-management/components/ui/SectionHead';
import {AddButton} from '@/features/user-management/components/ui/AddButton';
import {SessionExpiry} from '@/features/user-management/components/ui/SessionExpiry';
import {usePortalConfirm} from '@/features/user-management/components/ui/ConfirmDialog';
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
  const [askConfirm, confirmModal] = usePortalConfirm();
  return (
    <>
      <SectionHead
        icon="fa-users"
        color="#002c5f"
        title="Manage Users"
        action={
          <AddButton
            label="Add User"
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
              <th>Department</th>
              <th>Role (Portal)</th>
              <th>Session Expiry</th>
              <th style={{minWidth: 250}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.users.length === 0 && empty(8)}
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
                  <div style={{display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap'}}>
                    {u.department_name ? (
                      <span
                        className="badge-position"
                        style={{
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          borderColor: '#bfdbfe',
                          fontWeight: 700,
                        }}
                      >
                        {u.department_code || u.department_name}
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor: '#fff1f2',
                          color: '#be123c',
                          border: '1px solid #fecdd3',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        <i className="fas fa-exclamation-circle" /> Unassigned
                      </span>
                    )}

                    <button
                      type="button"
                      title={
                        u.department_name
                          ? `Transfer ${u.full_name || u.username} from ${u.department_name} to another department`
                          : `Assign ${u.full_name || u.username} to department`
                      }
                      style={{
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#002c5f',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        fontWeight: 700,
                        transition: 'all 0.15s',
                      }}
                      onClick={() =>
                        setDialog(
                          <AssignDepartmentDialog
                            title={`Transfer ${u.full_name || u.username} to Another Department`}
                            users={data.users}
                            departments={data.departments}
                            initialUserId={u.id}
                            onSave={payload =>
                              act(() => call('/departments/assign-user', 'PUT', payload))
                            }
                            onClose={() => setDialog(null)}
                          />,
                        )
                      }
                    >
                      <i className="fas fa-exchange-alt" style={{fontSize: '0.7rem', color: '#ff9900'}} />
                      <span>Transfer</span>
                    </button>
                  </div>
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
                            departments={data.departments}
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
                      title="Set Session Timeout"
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
                      title="Force Logout User Session"
                      onClick={async () => {
                        if (
                          await askConfirm({
                            title: 'Force logout session?',
                            message: `Force logout session for ${u.username}?`,
                            confirmLabel: 'Force logout',
                            danger: true,
                          })
                        ) {
                          await act(() => call(`/users/${u.id}/force-logout`, 'POST', {}));
                        }
                      }}
                    >
                      <i className="fas fa-power-off" />
                      Logout
                    </button>
                    {u.id !== currentUserId && (
                      <button
                        type="button"
                        className="um-btn danger"
                        aria-label={`Delete ${u.username}`}
                        onClick={async () => {
                          if (
                            await askConfirm({
                              title: 'Delete user?',
                              message: `Delete user ${u.username}?`,
                              confirmLabel: 'Delete',
                              danger: true,
                            })
                          ) {
                            await act(() => call(`/users/${u.id}`, 'DELETE'));
                          }
                        }}
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
      {confirmModal}
    </>
  );
}
