/** User management screen: tabs for users, roles, authorities, applications, audit log and sessions. */
import {ApplicationForm} from '@/features/user-management/components/forms/ApplicationForm';
import {AuthorityForm} from '@/features/user-management/components/forms/AuthorityForm';
import {PermissionsDialog} from '@/features/user-management/components/forms/PermissionsDialog';
import {RoleForm} from '@/features/user-management/components/forms/RoleForm';
import {UserForm} from '@/features/user-management/components/forms/UserForm';
import {Section} from '@/features/user-management/components/ui/Section';
import {Overview, TABS, Tab} from '@/features/user-management/lib/types';
import {call, fmt} from '@/features/user-management/lib/um-api';
import {useCallback, useEffect, useState, type ReactNode} from 'react';

export function UserManagement({currentUserId}: {currentUserId: number}) {
  const [data, setData] = useState<Overview | null>(null);
  const [tab, setTab] = useState<Tab>('users');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [dialog, setDialog] = useState<ReactNode>(null);

  const load = useCallback(async () => {
    try {
      setData(await call('/overview'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  /** Runs a mutation, then refreshes the overview and reports the outcome. */
  async function act(work: () => Promise<{message?: string} | void>) {
    try {
      const result = await work();
      setInfo((result && result.message) || 'Berhasil disimpan.');
      setError(null);
      setDialog(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  if (!data) return <div className="pt-empty">{error || 'Memuat data…'}</div>;
  const authoritiesByRole = new Map<number, number[]>();
  data.roleAuthorities.forEach(ra =>
    authoritiesByRole.set(ra.role_id, [...(authoritiesByRole.get(ra.role_id) || []), ra.authority_id]),
  );

  return (
    <>
      {error && <div className="pt-notice error">{error}</div>}
      {info && (
        <div className="pt-notice warn" onClick={() => setInfo(null)}>
          {info}
        </div>
      )}
      <nav className="pt-tabs">
        {TABS.map(t => (
          <button key={t.key} className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'users' && (
        <Section
          title="Users"
          action={
            <button
              className="pt-add-btn"
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
                        const fields = Object.fromEntries(Object.entries(v).filter(([k]) => !k.startsWith('access_')));
                        const created = await call('/users', 'POST', fields);
                        if (Object.values(access).some(Boolean)) await call(`/users/${created.id}/permissions`, 'PUT', access);
                      })
                    }
                    onClose={() => setDialog(null)}
                  />,
                )
              }
            >
              + Tambah user
            </button>
          }
        >
          <table className="pt-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Nama</th>
                <th>Posisi</th>
                <th>Email</th>
                <th>Role (Portal)</th>
                <th>Timeout</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.users.map(u => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.full_name}</td>
                  <td>{u.position}</td>
                  <td>{u.email || '-'}</td>
                  <td>{u.role_name || '-'}</td>
                  <td>
                    {u.session_timeout_minutes === 0
                      ? 'Unlimited'
                      : `${u.session_timeout_minutes ?? 15} menit`}
                  </td>
                  <td className="actions">
                    <button
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
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        setDialog(
                          <PermissionsDialog
                            userId={u.id}
                            name={u.username}
                            onSave={v => act(() => call(`/users/${u.id}/permissions`, 'PUT', v))}
                            onClose={() => setDialog(null)}
                          />,
                        )
                      }
                    >
                      Akses
                    </button>
                    <button
                      onClick={() => {
                        const v = prompt(
                          'Timeout sesi (menit, 0 = unlimited):',
                          String(u.session_timeout_minutes ?? 15),
                        );
                        if (v !== null)
                          act(() => call(`/users/${u.id}/session-timeout`, 'PUT', {timeout_minutes: v}));
                      }}
                    >
                      Timeout
                    </button>
                    <button
                      onClick={() =>
                        confirm(`Keluarkan paksa ${u.username}?`) &&
                        act(() => call(`/users/${u.id}/force-logout`, 'POST', {}))
                      }
                    >
                      Force logout
                    </button>
                    {u.id !== currentUserId && (
                      <button
                        className="danger"
                        onClick={() =>
                          confirm(`Hapus user ${u.username}?`) && act(() => call(`/users/${u.id}`, 'DELETE'))
                        }
                      >
                        Hapus
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {tab === 'roles' && (
        <Section
          title="Roles"
          action={
            <button
              className="pt-add-btn"
              onClick={() =>
                setDialog(
                  <RoleForm
                    data={data}
                    onSave={v => act(() => call('/roles', 'POST', v))}
                    onClose={() => setDialog(null)}
                  />,
                )
              }
            >
              + Tambah role
            </button>
          }
        >
          <table className="pt-table">
            <thead>
              <tr>
                <th>Aplikasi</th>
                <th>Role</th>
                <th>Deskripsi</th>
                <th>Authorities</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.roles.map(r => (
                <tr key={r.id}>
                  <td>{r.app_name}</td>
                  <td>{r.role_name}</td>
                  <td>{r.description}</td>
                  <td>{(authoritiesByRole.get(r.id) || []).length}</td>
                  <td className="actions">
                    <button
                      onClick={() =>
                        setDialog(
                          <RoleForm
                            data={data}
                            role={r}
                            selected={authoritiesByRole.get(r.id) || []}
                            onSave={v => act(() => call(`/roles/${r.id}`, 'PUT', v))}
                            onClose={() => setDialog(null)}
                          />,
                        )
                      }
                    >
                      Edit
                    </button>
                    <button
                      className="danger"
                      onClick={() =>
                        confirm(`Hapus role ${r.role_name}?`) && act(() => call(`/roles/${r.id}`, 'DELETE'))
                      }
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {tab === 'authorities' && (
        <Section
          title="Authorities"
          action={
            <button
              className="pt-add-btn"
              onClick={() =>
                setDialog(
                  <AuthorityForm
                    data={data}
                    onSave={v => act(() => call('/authorities', 'POST', v))}
                    onClose={() => setDialog(null)}
                  />,
                )
              }
            >
              + Tambah authority
            </button>
          }
        >
          <table className="pt-table">
            <thead>
              <tr>
                <th>Aplikasi</th>
                <th>Authority</th>
                <th>Deskripsi</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.authorities.map(a => (
                <tr key={a.id}>
                  <td>{a.app_name}</td>
                  <td>
                    <code>{a.authority_name}</code>
                  </td>
                  <td>{a.description}</td>
                  <td className="actions">
                    <button
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
                      Edit
                    </button>
                    <button
                      className="danger"
                      onClick={() =>
                        confirm(`Hapus authority ${a.authority_name}?`) &&
                        act(() => call(`/authorities/${a.id}`, 'DELETE'))
                      }
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {tab === 'applications' && (
        <Section
          title="Applications"
          action={
            <button
              className="pt-add-btn"
              onClick={() =>
                setDialog(
                  <ApplicationForm
                    onSave={v => act(() => call('/applications', 'POST', v))}
                    onClose={() => setDialog(null)}
                  />,
                )
              }
            >
              + Tambah aplikasi
            </button>
          }
        >
          <table className="pt-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nama</th>
                <th>URL</th>
                <th>Deskripsi</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.applications.map(a => (
                <tr key={a.id}>
                  <td>{a.id}</td>
                  <td>{a.app_name}</td>
                  <td>
                    <code>{a.url_path}</code>
                  </td>
                  <td>{a.description}</td>
                  <td className="actions">
                    <button
                      className="danger"
                      onClick={() =>
                        confirm(`Hapus aplikasi ${a.app_name}?`) &&
                        act(() => call(`/applications/${a.id}`, 'DELETE'))
                      }
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {tab === 'audit' && (
        <Section title="Audit log (500 terakhir)">
          <table className="pt-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>User</th>
                <th>Aksi</th>
                <th>Aplikasi</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {data.audits.map(a => (
                <tr key={a.id}>
                  <td>{fmt(a.timestamp)}</td>
                  <td>{a.username || '-'}</td>
                  <td>{a.action}</td>
                  <td>{a.app_name}</td>
                  <td>{a.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {tab === 'sessions' && (
        <Section title="Sessions (500 terakhir)">
          <table className="pt-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Aplikasi</th>
                <th>Login</th>
                <th>Aktivitas terakhir</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.sessions.map(s => {
                const active = !s.logout_time && !s.is_invalidated;
                return (
                  <tr key={s.id}>
                    <td>{s.username || '-'}</td>
                    <td>{s.app_name}</td>
                    <td>{fmt(s.login_time)}</td>
                    <td>{fmt(s.last_activity)}</td>
                    <td>{active ? 'Aktif' : 'Selesai'}</td>
                    <td className="actions">
                      {active && (
                        <button
                          className="danger"
                          onClick={() => act(() => call(`/sessions/${s.session_id}/terminate`, 'POST', {}))}
                        >
                          Akhiri
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}

      {dialog}
    </>
  );
}
