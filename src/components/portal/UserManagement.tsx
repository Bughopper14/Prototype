'use client';

import {useCallback, useEffect, useState, type FormEvent, type ReactNode} from 'react';

type Row = Record<string, any>;
type Overview = {
  users: Row[]; applications: Row[]; roles: Row[]; authorities: Row[];
  roleAuthorities: {role_id: number; authority_id: number}[]; audits: Row[]; sessions: Row[];
};
type Tab = 'users' | 'roles' | 'authorities' | 'applications' | 'audit' | 'sessions';

const TABS: {key: Tab; label: string}[] = [
  {key: 'users', label: 'Users'}, {key: 'roles', label: 'Roles'}, {key: 'authorities', label: 'Authorities'},
  {key: 'applications', label: 'Applications'}, {key: 'audit', label: 'Audit log'}, {key: 'sessions', label: 'Sessions'},
];

async function call(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(`/api/v1/um${path}`, {
    method, headers: body ? {'Content-Type': 'application/json'} : undefined, body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || 'Request failed');
  return data;
}

const fmt = (value: unknown) => (value ? new Date(String(value)).toLocaleString('id-ID') : '-');

export function UserManagement({currentUserId}: {currentUserId: number}) {
  const [data, setData] = useState<Overview | null>(null);
  const [tab, setTab] = useState<Tab>('users');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [dialog, setDialog] = useState<ReactNode>(null);

  const load = useCallback(async () => {
    try { setData(await call('/overview')); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
  }, []);
  useEffect(() => { load(); }, [load]);

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
  data.roleAuthorities.forEach(ra => authoritiesByRole.set(ra.role_id, [...(authoritiesByRole.get(ra.role_id) || []), ra.authority_id]));

  return (
    <>
      {error && <div className="pt-notice error">{error}</div>}
      {info && <div className="pt-notice warn" onClick={() => setInfo(null)}>{info}</div>}
      <nav className="pt-tabs">
        {TABS.map(t => <button key={t.key} className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </nav>

      {tab === 'users' && (
        <Section title="Users" action={<button className="pt-add-btn" onClick={() => setDialog(<UserForm onSave={v => act(() => call('/users', 'POST', v))} onClose={() => setDialog(null)} />)}>+ Tambah user</button>}>
          <table className="pt-table">
            <thead><tr><th>Username</th><th>Nama</th><th>Posisi</th><th>Email</th><th>Role (Portal)</th><th>Timeout</th><th /></tr></thead>
            <tbody>
              {data.users.map(u => (
                <tr key={u.id}>
                  <td>{u.username}</td><td>{u.full_name}</td><td>{u.position}</td><td>{u.email || '-'}</td><td>{u.role_name || '-'}</td>
                  <td>{u.session_timeout_minutes === 0 ? 'Unlimited' : `${u.session_timeout_minutes ?? 15} menit`}</td>
                  <td className="actions">
                    <button onClick={() => setDialog(<UserForm user={u} onSave={v => act(() => call(`/users/${u.id}`, 'PUT', v))} onClose={() => setDialog(null)} />)}>Edit</button>
                    <button onClick={() => setDialog(<PermissionsDialog userId={u.id} name={u.username} onSave={v => act(() => call(`/users/${u.id}/permissions`, 'PUT', v))} onClose={() => setDialog(null)} />)}>Akses</button>
                    <button onClick={() => { const v = prompt('Timeout sesi (menit, 0 = unlimited):', String(u.session_timeout_minutes ?? 15)); if (v !== null) act(() => call(`/users/${u.id}/session-timeout`, 'PUT', {timeout_minutes: v})); }}>Timeout</button>
                    <button onClick={() => confirm(`Keluarkan paksa ${u.username}?`) && act(() => call(`/users/${u.id}/force-logout`, 'POST', {}))}>Force logout</button>
                    {u.id !== currentUserId && <button className="danger" onClick={() => confirm(`Hapus user ${u.username}?`) && act(() => call(`/users/${u.id}`, 'DELETE'))}>Hapus</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {tab === 'roles' && (
        <Section title="Roles" action={<button className="pt-add-btn" onClick={() => setDialog(<RoleForm data={data} onSave={v => act(() => call('/roles', 'POST', v))} onClose={() => setDialog(null)} />)}>+ Tambah role</button>}>
          <table className="pt-table">
            <thead><tr><th>Aplikasi</th><th>Role</th><th>Deskripsi</th><th>Authorities</th><th /></tr></thead>
            <tbody>
              {data.roles.map(r => (
                <tr key={r.id}>
                  <td>{r.app_name}</td><td>{r.role_name}</td><td>{r.description}</td><td>{(authoritiesByRole.get(r.id) || []).length}</td>
                  <td className="actions">
                    <button onClick={() => setDialog(<RoleForm data={data} role={r} selected={authoritiesByRole.get(r.id) || []} onSave={v => act(() => call(`/roles/${r.id}`, 'PUT', v))} onClose={() => setDialog(null)} />)}>Edit</button>
                    <button className="danger" onClick={() => confirm(`Hapus role ${r.role_name}?`) && act(() => call(`/roles/${r.id}`, 'DELETE'))}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {tab === 'authorities' && (
        <Section title="Authorities" action={<button className="pt-add-btn" onClick={() => setDialog(<AuthorityForm data={data} onSave={v => act(() => call('/authorities', 'POST', v))} onClose={() => setDialog(null)} />)}>+ Tambah authority</button>}>
          <table className="pt-table">
            <thead><tr><th>Aplikasi</th><th>Authority</th><th>Deskripsi</th><th /></tr></thead>
            <tbody>
              {data.authorities.map(a => (
                <tr key={a.id}><td>{a.app_name}</td><td><code>{a.authority_name}</code></td><td>{a.description}</td>
                  <td className="actions"><button className="danger" onClick={() => confirm(`Hapus authority ${a.authority_name}?`) && act(() => call(`/authorities/${a.id}`, 'DELETE'))}>Hapus</button></td></tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {tab === 'applications' && (
        <Section title="Applications" action={<button className="pt-add-btn" onClick={() => setDialog(<ApplicationForm onSave={v => act(() => call('/applications', 'POST', v))} onClose={() => setDialog(null)} />)}>+ Tambah aplikasi</button>}>
          <table className="pt-table">
            <thead><tr><th>ID</th><th>Nama</th><th>URL</th><th>Deskripsi</th><th /></tr></thead>
            <tbody>
              {data.applications.map(a => (
                <tr key={a.id}><td>{a.id}</td><td>{a.app_name}</td><td><code>{a.url_path}</code></td><td>{a.description}</td>
                  <td className="actions"><button className="danger" onClick={() => confirm(`Hapus aplikasi ${a.app_name}?`) && act(() => call(`/applications/${a.id}`, 'DELETE'))}>Hapus</button></td></tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {tab === 'audit' && (
        <Section title="Audit log (500 terakhir)">
          <table className="pt-table">
            <thead><tr><th>Waktu</th><th>User</th><th>Aksi</th><th>Aplikasi</th><th>IP</th></tr></thead>
            <tbody>{data.audits.map(a => <tr key={a.id}><td>{fmt(a.timestamp)}</td><td>{a.username || '-'}</td><td>{a.action}</td><td>{a.app_name}</td><td>{a.ip_address}</td></tr>)}</tbody>
          </table>
        </Section>
      )}

      {tab === 'sessions' && (
        <Section title="Sessions (500 terakhir)">
          <table className="pt-table">
            <thead><tr><th>User</th><th>Aplikasi</th><th>Login</th><th>Aktivitas terakhir</th><th>Status</th><th /></tr></thead>
            <tbody>
              {data.sessions.map(s => {
                const active = !s.logout_time && !s.is_invalidated;
                return (
                  <tr key={s.id}>
                    <td>{s.username || '-'}</td><td>{s.app_name}</td><td>{fmt(s.login_time)}</td><td>{fmt(s.last_activity)}</td>
                    <td>{active ? 'Aktif' : 'Selesai'}</td>
                    <td className="actions">{active && <button className="danger" onClick={() => act(() => call(`/sessions/${s.session_id}/terminate`, 'POST', {}))}>Akhiri</button>}</td>
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

function Section({title, action, children}: {title: string; action?: ReactNode; children: ReactNode}) {
  return (
    <section className="pt-panel">
      <div className="pt-panel-head"><h3>{title}</h3>{action}</div>
      <div className="pt-table-wrap">{children}</div>
    </section>
  );
}

function Dialog({title, onClose, onSubmit, children}: {title: string; onClose: () => void; onSubmit: (form: FormData) => void; children: ReactNode}) {
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onSubmit(new FormData(event.currentTarget)); };
  return (
    <div className="pt-modal-backdrop" onClick={onClose}>
      <form className="pt-modal" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <div className="pt-modal-bar" />
        <div className="pt-modal-head">
          <div className="pt-modal-title"><h5>{title}</h5></div>
          <button type="button" className="pt-modal-close" aria-label="Close" onClick={onClose}><i className="fas fa-times" /></button>
        </div>
        <div className="pt-modal-body">{children}</div>
        <div className="pt-modal-foot">
          <button type="button" className="pt-btn-light" onClick={onClose}>Batal</button>
          <button className="pt-btn-primary">Simpan</button>
        </div>
      </form>
    </div>
  );
}

const Field = ({label, name, type = 'text', defaultValue, required}: {label: string; name: string; type?: string; defaultValue?: string; required?: boolean}) => (
  <label className="pt-field"><span className="pt-form-label">{label}</span><input className="pt-input" name={name} type={type} defaultValue={defaultValue} required={required} /></label>
);

function UserForm({user, onSave, onClose}: {user?: Row; onSave: (v: Row) => void; onClose: () => void}) {
  return (
    <Dialog title={user ? 'Edit user' : 'Tambah user'} onClose={onClose} onSubmit={f => onSave(Object.fromEntries(f))}>
      <Field label="Username" name="username" defaultValue={user?.username} required />
      <Field label="Nama lengkap" name="full_name" defaultValue={user?.full_name} required />
      <Field label="Posisi" name="position" defaultValue={user?.position || 'Staff'} />
      <Field label="Email" name="email" type="email" defaultValue={user?.email || ''} />
      <Field label={user ? 'Password baru (kosongkan jika tidak diubah)' : 'Password'} name="password" type="password" required={!user} />
    </Dialog>
  );
}

function ApplicationForm({onSave, onClose}: {onSave: (v: Row) => void; onClose: () => void}) {
  return (
    <Dialog title="Tambah aplikasi" onClose={onClose} onSubmit={f => onSave(Object.fromEntries(f))}>
      <Field label="Nama aplikasi" name="app_name" required />
      <Field label="URL path" name="url_path" required />
      <Field label="Deskripsi" name="description" />
      <Field label="Icon class" name="icon_class" defaultValue="fas fa-layer-group" />
    </Dialog>
  );
}

function AuthorityForm({data, onSave, onClose}: {data: Overview; onSave: (v: Row) => void; onClose: () => void}) {
  return (
    <Dialog title="Tambah authority" onClose={onClose} onSubmit={f => onSave(Object.fromEntries(f))}>
      <label className="pt-field"><span className="pt-form-label">Aplikasi</span>
        <select name="app_id" className="pt-select" required>{data.applications.map(a => <option key={a.id} value={a.id}>{a.app_name}</option>)}</select></label>
      <Field label="Nama authority" name="authority_name" required />
      <Field label="Deskripsi" name="description" />
    </Dialog>
  );
}

function RoleForm({data, role, selected = [], onSave, onClose}: {data: Overview; role?: Row; selected?: number[]; onSave: (v: Row) => void; onClose: () => void}) {
  const [appId, setAppId] = useState<number>(role?.app_id ?? data.applications[0]?.id);
  return (
    <Dialog title={role ? 'Edit role' : 'Tambah role'} onClose={onClose}
      onSubmit={f => onSave({app_id: appId, role_name: f.get('role_name'), description: f.get('description'), authorities: f.getAll('authorities').map(Number)})}>
      {!role && (
        <label className="pt-field"><span className="pt-form-label">Aplikasi</span>
          <select className="pt-select" value={appId} onChange={e => setAppId(Number(e.target.value))}>{data.applications.map(a => <option key={a.id} value={a.id}>{a.app_name}</option>)}</select></label>
      )}
      <Field label="Nama role" name="role_name" defaultValue={role?.role_name} required />
      <Field label="Deskripsi" name="description" defaultValue={role?.description || ''} />
      <div className="pt-field"><span className="pt-form-label">Authorities</span>
        <div className="pt-checks">
          {data.authorities.filter(a => a.app_id === appId).map(a => (
            <label key={a.id}><input type="checkbox" name="authorities" value={a.id} defaultChecked={selected.includes(a.id)} /> {a.authority_name}</label>
          ))}
        </div>
      </div>
    </Dialog>
  );
}

function PermissionsDialog({userId, name, onSave, onClose}: {userId: number; name: string; onSave: (v: Row) => void; onClose: () => void}) {
  const [state, setState] = useState<{applications: Row[]; currentPermissions: Record<string, number>; roles: Row[]} | null>(null);
  useEffect(() => { call(`/users/${userId}/permissions`).then(setState); }, [userId]);
  return (
    <Dialog title={`Akses · ${name}`} onClose={onClose} onSubmit={f => onSave(Object.fromEntries([...f.entries()].map(([k, v]) => [k, v || null])))}>
      {!state ? <p>Memuat…</p> : state.applications.map(a => (
        <label key={a.id} className="pt-field"><span className="pt-form-label">{a.app_name}</span>
          <select className="pt-select" name={String(a.id)} defaultValue={state.currentPermissions[a.id] ?? ''}>
            <option value="">— tanpa akses —</option>
            {state.roles.filter(r => r.app_id === a.id).map(r => <option key={r.id} value={r.id}>{r.role_name}</option>)}
          </select>
        </label>
      ))}
    </Dialog>
  );
}
