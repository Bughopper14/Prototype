/** User management screen matching LiugongApps_Clean/User_Management/templates/admin.html */
import {ApplicationForm} from '@/features/user-management/components/forms/ApplicationForm';
import {AuthorityForm} from '@/features/user-management/components/forms/AuthorityForm';
import {PermissionsDialog} from '@/features/user-management/components/forms/PermissionsDialog';
import {RoleForm} from '@/features/user-management/components/forms/RoleForm';
import {UserForm} from '@/features/user-management/components/forms/UserForm';
import {Overview, Tab} from '@/features/user-management/lib/types';
import {call, fmt} from '@/features/user-management/lib/um-api';
import {useCallback, useEffect, useMemo, useState, type ReactNode} from 'react';

export function UserManagement({currentUserId}: {currentUserId: number}) {
  const [data, setData] = useState<Overview | null>(null);
  const [tab, setTab] = useState<Tab>('users');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [dialog, setDialog] = useState<ReactNode>(null);

  // Per-tab search & pagination
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // Reset pagination when tab changes
  const switchTab = (t: Tab) => {
    setTab(t);
    setSearch('');
    setPage(1);
  };

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

  const authoritiesByRole = useMemo(() => {
    const map = new Map<number, number[]>();
    if (!data) return map;
    data.roleAuthorities.forEach(ra =>
      map.set(ra.role_id, [...(map.get(ra.role_id) || []), ra.authority_id]),
    );
    return map;
  }, [data]);

  // Tab 1: Users filtering
  const filteredUsers = useMemo(() => {
    if (!data?.users) return [];
    const q = search.toLowerCase().trim();
    if (!q) return data.users;
    return data.users.filter(
      u =>
        u.username?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.position?.toLowerCase().includes(q),
    );
  }, [data?.users, search]);

  // Tab 2: Apps filtering
  const filteredApps = useMemo(() => {
    if (!data?.applications) return [];
    const q = search.toLowerCase().trim();
    if (!q) return data.applications;
    return data.applications.filter(
      a =>
        a.app_name?.toLowerCase().includes(q) ||
        a.url_path?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q),
    );
  }, [data?.applications, search]);

  // Tab 3: Roles filtering
  const filteredRoles = useMemo(() => {
    if (!data?.roles) return [];
    const q = search.toLowerCase().trim();
    if (!q) return data.roles;
    return data.roles.filter(
      r =>
        r.role_name?.toLowerCase().includes(q) ||
        r.app_name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q),
    );
  }, [data?.roles, search]);

  // Tab 4: Authorities filtering
  const filteredAuthorities = useMemo(() => {
    if (!data?.authorities) return [];
    const q = search.toLowerCase().trim();
    if (!q) return data.authorities;
    return data.authorities.filter(
      a =>
        a.authority_name?.toLowerCase().includes(q) ||
        a.app_name?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q),
    );
  }, [data?.authorities, search]);

  // Tab 5: Audit filtering
  const filteredAudits = useMemo(() => {
    if (!data?.audits) return [];
    const q = search.toLowerCase().trim();
    if (!q) return data.audits;
    return data.audits.filter(
      a =>
        a.username?.toLowerCase().includes(q) ||
        a.action?.toLowerCase().includes(q) ||
        a.app_name?.toLowerCase().includes(q) ||
        a.ip_address?.toLowerCase().includes(q),
    );
  }, [data?.audits, search]);

  // Tab 6: Sessions filtering
  const filteredSessions = useMemo(() => {
    if (!data?.sessions) return [];
    const q = search.toLowerCase().trim();
    if (!q) return data.sessions;
    return data.sessions.filter(
      s =>
        s.username?.toLowerCase().includes(q) ||
        s.app_name?.toLowerCase().includes(q) ||
        s.session_id?.toLowerCase().includes(q),
    );
  }, [data?.sessions, search]);

  // Current active list
  const activeList = useMemo(() => {
    switch (tab) {
      case 'users':
        return filteredUsers;
      case 'applications':
        return filteredApps;
      case 'roles':
        return filteredRoles;
      case 'authorities':
        return filteredAuthorities;
      case 'audit':
        return filteredAudits;
      case 'sessions':
        return filteredSessions;
      default:
        return [];
    }
  }, [tab, filteredUsers, filteredApps, filteredRoles, filteredAuthorities, filteredAudits, filteredSessions]);

  const totalPages = Math.ceil(activeList.length / pageSize) || 1;
  const pagedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return activeList.slice(start, start + pageSize);
  }, [activeList, page, pageSize]);

  if (!data) return <div className="pt-empty">{error || 'Memuat data…'}</div>;

  return (
    <>
      {error && <div className="pt-notice error">{error}</div>}
      {info && (
        <div className="pt-notice warn" onClick={() => setInfo(null)}>
          {info}
        </div>
      )}

      {/* TABS CONTAINER CARD */}
      <div className="card p-3 shadow-sm" style={{borderRadius: 16}}>
        <div className="tabs-scroll-container">
          <ul className="nav nav-tabs mb-0" id="adminTabs" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${tab === 'users' ? 'active' : ''}`}
                onClick={() => switchTab('users')}
                type="button"
              >
                <i className="fas fa-users me-1" /> Users{' '}
                <span
                  className="badge bg-secondary-subtle text-secondary rounded-pill ms-1"
                  style={{background: '#e2e8f0', color: '#475569'}}
                >
                  {data.users.length}
                </span>
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${tab === 'applications' ? 'active' : ''}`}
                onClick={() => switchTab('applications')}
                type="button"
              >
                <i className="fas fa-layer-group me-1" /> Apps{' '}
                <span
                  className="badge bg-secondary-subtle text-secondary rounded-pill ms-1"
                  style={{background: '#e2e8f0', color: '#475569'}}
                >
                  {data.applications.length}
                </span>
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${tab === 'roles' ? 'active' : ''}`}
                onClick={() => switchTab('roles')}
                type="button"
              >
                <i className="fas fa-user-tag me-1" /> Roles{' '}
                <span
                  className="badge bg-secondary-subtle text-secondary rounded-pill ms-1"
                  style={{background: '#e2e8f0', color: '#475569'}}
                >
                  {data.roles.length}
                </span>
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${tab === 'authorities' ? 'active' : ''}`}
                onClick={() => switchTab('authorities')}
                type="button"
              >
                <i className="fas fa-key me-1" /> Authorities{' '}
                <span
                  className="badge bg-primary text-white rounded-pill ms-1"
                  style={{background: '#0d6efd', color: '#fff'}}
                >
                  {data.authorities.length}
                </span>
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${tab === 'audit' ? 'active' : ''}`}
                onClick={() => switchTab('audit')}
                type="button"
              >
                <i className="fas fa-history me-1" /> Audit
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${tab === 'sessions' ? 'active' : ''}`}
                onClick={() => switchTab('sessions')}
                type="button"
              >
                <i className="fas fa-sign-in-alt me-1" /> Sessions
              </button>
            </li>
          </ul>
        </div>

        {/* TAB 1: USERS */}
        {tab === 'users' && (
          <div className="py-2">
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <h5 className="fw-bold text-secondary mb-0" style={{color: '#334155', display: 'flex', alignItems: 'center'}}>
                <i className="fas fa-users me-2 text-primary" style={{color: '#002c5f'}} />
                Manage Users
              </h5>
              <button
                className="btn btn-primary btn-sm px-4"
                style={{backgroundColor: '#002c5f', borderColor: '#002c5f', color: '#fff', borderRadius: 8, fontWeight: 600}}
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
              >
                <i className="fas fa-plus me-1" /> Tambah User
              </button>
            </div>

            {/* Filter controls */}
            <div className="filter-controls-wrap">
              <div className="d-flex align-items-center gap-2">
                <span>Tampilkan</span>
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>data</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span>Cari:</span>
                <input
                  type="search"
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder=""
                />
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle dataTable w-100">
                <thead className="table-light">
                  <tr>
                    <th className="th-sort">USERNAME <i className="fas fa-sort" /></th>
                    <th className="th-sort">FULL NAME <i className="fas fa-sort" /></th>
                    <th className="th-sort">EMAIL <i className="fas fa-sort" /></th>
                    <th className="th-sort">POSITION <i className="fas fa-sort" /></th>
                    <th className="th-sort">SESSION EXPIRY <i className="fas fa-sort" /></th>
                    <th className="th-sort" style={{minWidth: 260}}>ACTIONS <i className="fas fa-sort" /></th>
                  </tr>
                </thead>
                <tbody>
                  {pagedList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-muted">
                        Tidak ada data user.
                      </td>
                    </tr>
                  ) : (
                    (pagedList as typeof data.users).map(u => (
                      <tr key={u.id}>
                        <td><strong>{u.username}</strong></td>
                        <td>{u.full_name}</td>
                        <td>
                          {u.email ? (
                            <a href={`mailto:${u.email}`} className="text-secondary small" style={{textDecoration: 'none'}}>
                              <i className="fas fa-envelope me-1 text-muted" />{u.email}
                            </a>
                          ) : (
                            <span className="text-muted small">—</span>
                          )}
                        </td>
                        <td><span className="badge-position">{u.position || 'Staff'}</span></td>
                        <td>
                          {u.session_timeout_minutes === 0 ? (
                            <span
                              className="badge bg-success bg-opacity-10 text-success border border-success-subtle px-2 py-1 rounded-pill fw-semibold"
                              style={{
                                background: 'rgba(25, 135, 84, 0.1)',
                                color: '#198754',
                                border: '1px solid rgba(25, 135, 84, 0.25)',
                                borderRadius: 20,
                              }}
                            >
                              <i className="fas fa-infinity me-1" />Unlimited
                            </span>
                          ) : u.session_timeout_minutes ? (
                            <span
                              className="badge bg-primary bg-opacity-10 text-primary border border-primary-subtle px-2 py-1 rounded-pill fw-semibold"
                              style={{
                                background: 'rgba(13, 110, 253, 0.1)',
                                color: '#0d6efd',
                                border: '1px solid rgba(13, 110, 253, 0.25)',
                                borderRadius: 20,
                              }}
                            >
                              <i className="fas fa-stopwatch me-1" />{u.session_timeout_minutes} min
                            </span>
                          ) : (
                            <span
                              className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary-subtle px-2 py-1 rounded-pill fw-semibold"
                              style={{
                                background: 'rgba(108, 117, 125, 0.1)',
                                color: '#6c757d',
                                border: '1px solid rgba(108, 117, 125, 0.25)',
                                borderRadius: 20,
                              }}
                            >
                              <i className="fas fa-clock me-1" />Default (15m)
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="d-flex gap-1 flex-wrap">
                            <button
                              className="btn btn-warning btn-sm text-white"
                              style={{backgroundColor: '#ff9900', borderColor: '#ff9900', color: '#fff'}}
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
                              <i className="fas fa-edit me-1" />Edit
                            </button>
                            <button
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => {
                                const v = prompt(
                                  'Timeout sesi (menit, 0 = unlimited):',
                                  String(u.session_timeout_minutes ?? 15),
                                );
                                if (v !== null)
                                  act(() => call(`/users/${u.id}/session-timeout`, 'PUT', {timeout_minutes: v}));
                              }}
                              title="Set Batas Waktu Sesi (Session Expired)"
                            >
                              <i className="fas fa-stopwatch me-1 text-warning" />Session
                            </button>
                            <button
                              className="btn btn-outline-primary btn-sm"
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
                              <i className="fas fa-lock me-1" />Access
                            </button>
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={() =>
                                confirm(`Keluarkan paksa ${u.username}?`) &&
                                act(() => call(`/users/${u.id}/force-logout`, 'POST', {}))
                              }
                              title="Keluarkan Paksa Sesi User"
                            >
                              <i className="fas fa-power-off me-1" />Logout
                            </button>
                            {u.id !== currentUserId && (
                              <button
                                className="btn btn-danger btn-sm"
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
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="pagination-wrap">
              <div>Halaman {page} dari {totalPages}</div>
              <div className="pagination-btns">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  Prev
                </button>
                {Array.from({length: totalPages}).map((_, i) => (
                  <button
                    key={i}
                    className={page === i + 1 ? 'active' : ''}
                    onClick={() => setPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: APPS (MATCHING SCREENSHOT 2) */}
        {tab === 'applications' && (
          <div className="py-2">
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <h5 className="fw-bold text-secondary mb-0" style={{color: '#334155'}}>
                <i className="fas fa-layer-group me-2 text-info" />Master Aplikasi
              </h5>
              <button
                className="btn btn-primary btn-sm px-4"
                style={{backgroundColor: '#002c5f', borderColor: '#002c5f', color: '#fff', borderRadius: 8, fontWeight: 600}}
                onClick={() =>
                  setDialog(
                    <ApplicationForm
                      onSave={v => act(() => call('/applications', 'POST', v))}
                      onClose={() => setDialog(null)}
                    />,
                  )
                }
              >
                <i className="fas fa-plus me-1" /> Tambah Aplikasi
              </button>
            </div>

            {/* Filter controls */}
            <div className="filter-controls-wrap">
              <div className="d-flex align-items-center gap-2">
                <span>Tampilkan</span>
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>data</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span>Cari:</span>
                <input
                  type="search"
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder=""
                />
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle dataTable w-100">
                <thead className="table-light">
                  <tr>
                    <th className="th-sort">APP NAME <i className="fas fa-sort" /></th>
                    <th className="th-sort">URL PATH <i className="fas fa-sort" /></th>
                    <th className="th-sort">DESCRIPTION <i className="fas fa-sort" /></th>
                    <th className="th-sort" style={{width: 80}}>ACTIONS <i className="fas fa-sort" /></th>
                  </tr>
                </thead>
                <tbody>
                  {pagedList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-muted">
                        Tidak ada aplikasi.
                      </td>
                    </tr>
                  ) : (
                    (pagedList as typeof data.applications).map(a => (
                      <tr key={a.id}>
                        <td>
                          <i
                            className={`${
                              a.app_name?.toLowerCase().includes('crm')
                                ? 'fas fa-tachometer-alt'
                                : 'fas fa-users-cog'
                            } me-2 text-primary`}
                          />
                          <strong className="text-secondary">{a.app_name}</strong>
                        </td>
                        <td>
                          <code className="text-secondary" style={{color: '#6c757d', background: 'none'}}>
                            {a.url_path}
                          </code>
                        </td>
                        <td>
                          <small className="text-muted">{a.description}</small>
                        </td>
                        <td>
                          <button
                            className="btn btn-danger btn-sm"
                            style={{borderRadius: 8}}
                            onClick={() =>
                              confirm(`Hapus aplikasi ${a.app_name}?`) && act(() => call(`/applications/${a.id}`, 'DELETE'))
                            }
                          >
                            <i className="fas fa-trash" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="pagination-wrap">
              <div>Halaman {page} dari {totalPages}</div>
              <div className="pagination-btns">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  Prev
                </button>
                {Array.from({length: totalPages}).map((_, i) => (
                  <button
                    key={i}
                    className={page === i + 1 ? 'active' : ''}
                    onClick={() => setPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ROLES (MATCHING SCREENSHOT 3) */}
        {tab === 'roles' && (
          <div className="py-2">
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <h5 className="fw-bold text-secondary mb-0" style={{color: '#334155'}}>
                  <i className="fas fa-user-tag me-2 text-success" />Manage Roles
                </h5>
                <span
                  className="badge bg-success bg-opacity-10 text-success border border-success-subtle rounded-pill px-2 py-1 small fw-bold"
                  style={{background: 'rgba(25, 135, 84, 0.1)', color: '#198754'}}
                >
                  {data.roles.length} Roles
                </span>
              </div>
              <button
                className="btn btn-primary btn-sm px-4"
                style={{backgroundColor: '#002c5f', borderColor: '#002c5f', color: '#fff', borderRadius: 8, fontWeight: 600}}
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
                <i className="fas fa-plus me-1" /> Tambah Role
              </button>
            </div>

            {/* Filter controls */}
            <div className="filter-controls-wrap">
              <div className="d-flex align-items-center gap-2">
                <span>Tampilkan</span>
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>data</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span>Cari:</span>
                <input
                  type="search"
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder=""
                />
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle dataTable w-100">
                <thead className="table-light">
                  <tr>
                    <th className="th-sort">ROLE NAME <i className="fas fa-sort" /></th>
                    <th className="th-sort">APP <i className="fas fa-sort" /></th>
                    <th className="th-sort">AUTHORITIES <i className="fas fa-sort" /></th>
                    <th className="th-sort" style={{width: 100}}>ACTIONS <i className="fas fa-sort" /></th>
                  </tr>
                </thead>
                <tbody>
                  {pagedList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-muted">
                        Tidak ada role.
                      </td>
                    </tr>
                  ) : (
                    (pagedList as typeof data.roles).map(r => {
                      const authIds = authoritiesByRole.get(r.id) || [];
                      return (
                        <tr key={r.id}>
                          <td>
                            <div className="d-flex align-items-center gap-1">
                              <strong>{r.role_name}</strong>
                              <span
                                className="badge bg-primary bg-opacity-10 text-primary border border-primary-subtle rounded-pill small ms-1"
                                style={{background: 'rgba(13, 110, 253, 0.1)', color: '#0d6efd'}}
                              >
                                {authIds.length} otoritas
                              </span>
                            </div>
                            {r.description && <div className="text-muted small">{r.description}</div>}
                          </td>
                          <td>
                            <span className="badge-app">{r.app_name}</span>
                          </td>
                          <td>
                            <div className="mb-1 text-muted small fw-semibold">
                              <i className="fas fa-check-circle text-success me-1" />
                              {authIds.length} otoritas aktif:
                            </div>
                            <div className="d-flex flex-wrap gap-1">
                              {authIds.map(authId => {
                                const auth = data.authorities.find(a => a.id === authId);
                                return auth ? (
                                  <span key={authId} className="badge-auth">
                                    {auth.authority_name}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <button
                                className="btn btn-warning btn-sm text-white"
                                style={{borderRadius: 8}}
                                onClick={() =>
                                  setDialog(
                                    <RoleForm
                                      data={data}
                                      role={r}
                                      selected={authIds}
                                      onSave={v => act(() => call(`/roles/${r.id}`, 'PUT', v))}
                                      onClose={() => setDialog(null)}
                                    />,
                                  )
                                }
                              >
                                <i className="fas fa-edit" />
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                style={{borderRadius: 8}}
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
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="pagination-wrap">
              <div>Halaman {page} dari {totalPages}</div>
              <div className="pagination-btns">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  Prev
                </button>
                {Array.from({length: totalPages}).map((_, i) => (
                  <button
                    key={i}
                    className={page === i + 1 ? 'active' : ''}
                    onClick={() => setPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AUTHORITIES (MATCHING SCREENSHOT 4) */}
        {tab === 'authorities' && (
          <div className="py-2">
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <h5 className="fw-bold text-secondary mb-0" style={{color: '#334155'}}>
                  <i className="fas fa-key me-2 text-warning" />Otoritas (Rights)
                </h5>
                <span
                  className="badge bg-primary bg-opacity-10 text-primary border border-primary-subtle rounded-pill px-3 py-1 fs-6 fw-bold"
                  style={{background: 'rgba(13, 110, 253, 0.1)', color: '#0d6efd'}}
                >
                  <i className="fas fa-shield-alt me-1" />Total: {data.authorities.length} Otoritas
                </span>
              </div>
              <button
                className="btn btn-primary btn-sm px-4"
                style={{backgroundColor: '#002c5f', borderColor: '#002c5f', color: '#fff', borderRadius: 8, fontWeight: 600}}
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
                <i className="fas fa-plus me-1" /> Tambah Otoritas
              </button>
            </div>

            {/* Filter controls */}
            <div className="filter-controls-wrap">
              <div className="d-flex align-items-center gap-2">
                <span>Tampilkan</span>
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>data</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span>Cari:</span>
                <input
                  type="search"
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder=""
                />
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle dataTable w-100">
                <thead className="table-light">
                  <tr>
                    <th style={{width: 50}} className="th-sort text-center"># <i className="fas fa-sort" /></th>
                    <th className="th-sort">KODE OTORITAS <i className="fas fa-sort" /></th>
                    <th className="th-sort">APLIKASI <i className="fas fa-sort" /></th>
                    <th className="th-sort">DESKRIPSI <i className="fas fa-sort" /></th>
                    <th style={{width: 80}} className="th-sort text-center">ACTIONS <i className="fas fa-sort" /></th>
                  </tr>
                </thead>
                <tbody>
                  {pagedList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-muted">
                        Tidak ada otoritas.
                      </td>
                    </tr>
                  ) : (
                    (pagedList as typeof data.authorities).map((a, idx) => (
                      <tr key={a.id}>
                        <td className="text-center fw-bold text-muted">
                          {(page - 1) * pageSize + idx + 1}
                        </td>
                        <td>
                          <code style={{color: '#d63384', background: 'none', fontWeight: 500}}>
                            {a.authority_name}
                          </code>
                        </td>
                        <td>
                          <span className="badge-app">{a.app_name}</span>
                        </td>
                        <td>
                          <small className="text-muted">{a.description}</small>
                        </td>
                        <td className="text-center">
                          <button
                            className="btn btn-danger btn-sm"
                            style={{borderRadius: 8}}
                            onClick={() =>
                              confirm(`Hapus authority ${a.authority_name}?`) && act(() => call(`/authorities/${a.id}`, 'DELETE'))
                            }
                          >
                            <i className="fas fa-trash" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="pagination-wrap">
              <div>Halaman {page} dari {totalPages}</div>
              <div className="pagination-btns">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  Prev
                </button>
                {Array.from({length: totalPages}).map((_, i) => (
                  <button
                    key={i}
                    className={page === i + 1 ? 'active' : ''}
                    onClick={() => setPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT LOG (MATCHING SCREENSHOT 5) */}
        {tab === 'audit' && (
          <div className="py-2">
            <h5 className="fw-bold text-secondary mb-3" style={{color: '#334155'}}>
              <i className="fas fa-history me-2" />Audit Logs
            </h5>

            {/* Filter controls */}
            <div className="filter-controls-wrap">
              <div className="d-flex align-items-center gap-2">
                <span>Tampilkan</span>
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>data</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span>Cari:</span>
                <input
                  type="search"
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder=""
                />
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle dataTable w-100">
                <thead className="table-light">
                  <tr>
                    <th className="th-sort">WAKTU <i className="fas fa-sort" /></th>
                    <th className="th-sort">USER <i className="fas fa-sort" /></th>
                    <th className="th-sort">APLIKASI <i className="fas fa-sort" /></th>
                    <th className="th-sort">AKSI <i className="fas fa-sort" /></th>
                  </tr>
                </thead>
                <tbody>
                  {pagedList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-muted">
                        Tidak ada log audit.
                      </td>
                    </tr>
                  ) : (
                    (pagedList as typeof data.audits).map(a => (
                      <tr key={a.id}>
                        <td>{fmt(a.timestamp)}</td>
                        <td><strong>{a.username || '-'}</strong></td>
                        <td><span className="badge-app">{a.app_name}</span></td>
                        <td>{a.action}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="pagination-wrap">
              <div>Halaman {page} dari {totalPages}</div>
              <div className="pagination-btns">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  Prev
                </button>
                {Array.from({length: totalPages}).map((_, i) => (
                  <button
                    key={i}
                    className={page === i + 1 ? 'active' : ''}
                    onClick={() => setPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SESSIONS */}
        {tab === 'sessions' && (
          <div className="py-2">
            <h5 className="fw-bold text-secondary mb-3" style={{color: '#334155'}}>
              <i className="fas fa-sign-in-alt me-2" />Active Sessions
            </h5>

            {/* Filter controls */}
            <div className="filter-controls-wrap">
              <div className="d-flex align-items-center gap-2">
                <span>Tampilkan</span>
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>data</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span>Cari:</span>
                <input
                  type="search"
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder=""
                />
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle dataTable w-100">
                <thead className="table-light">
                  <tr>
                    <th className="th-sort">USER <i className="fas fa-sort" /></th>
                    <th className="th-sort">APLIKASI <i className="fas fa-sort" /></th>
                    <th className="th-sort">LOGIN <i className="fas fa-sort" /></th>
                    <th className="th-sort">AKTIVITAS TERAKHIR <i className="fas fa-sort" /></th>
                    <th className="th-sort">STATUS <i className="fas fa-sort" /></th>
                    <th className="th-sort" style={{width: 100}}>ACTIONS <i className="fas fa-sort" /></th>
                  </tr>
                </thead>
                <tbody>
                  {pagedList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-muted">
                        Tidak ada sesi aktif.
                      </td>
                    </tr>
                  ) : (
                    (pagedList as typeof data.sessions).map(s => {
                      const active = !s.logout_time && !s.is_invalidated;
                      return (
                        <tr key={s.id}>
                          <td><strong>{s.username || '-'}</strong></td>
                          <td><span className="badge-app">{s.app_name}</span></td>
                          <td>{fmt(s.login_time)}</td>
                          <td>{fmt(s.last_activity)}</td>
                          <td>
                            <span
                              className="badge-auth"
                              style={{
                                background: active ? '#f0fdf4' : '#f1f5f9',
                                color: active ? '#166534' : '#64748b',
                              }}
                            >
                              {active ? 'Aktif' : 'Selesai'}
                            </span>
                          </td>
                          <td>
                            {active && (
                              <button
                                className="btn btn-outline-danger btn-sm"
                                style={{borderRadius: 8}}
                                onClick={() => act(() => call(`/sessions/${s.session_id}/terminate`, 'POST', {}))}
                              >
                                <i className="fas fa-power-off me-1" />Akhiri
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="pagination-wrap">
              <div>Halaman {page} dari {totalPages}</div>
              <div className="pagination-btns">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  Prev
                </button>
                {Array.from({length: totalPages}).map((_, i) => (
                  <button
                    key={i}
                    className={page === i + 1 ? 'active' : ''}
                    onClick={() => setPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {dialog}
    </>
  );
}
