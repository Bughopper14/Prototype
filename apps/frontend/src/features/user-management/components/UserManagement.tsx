/** System Administration: users, apps, roles, authorities, audit log and sessions (LiugongApps admin console look). */
import {SessionsTab} from '@/features/user-management/components/tabs/SessionsTab';
import {AuditTab} from '@/features/user-management/components/tabs/AuditTab';
import {AuthoritiesTab} from '@/features/user-management/components/tabs/AuthoritiesTab';
import {RolesTab} from '@/features/user-management/components/tabs/RolesTab';
import {ApplicationsTab} from '@/features/user-management/components/tabs/ApplicationsTab';
import {UsersTab} from '@/features/user-management/components/tabs/UsersTab';
import {Overview, TABS, Tab} from '@/features/user-management/lib/types';
import {call} from '@/features/user-management/lib/um-api';
import {useCallback, useEffect, useState, type ReactNode} from 'react';
import '../user-management.css';

export function UserManagement({currentUserId, fullName}: {currentUserId: number; fullName?: string}) {
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

  if (!data) return <div className="um-empty">{error || 'Memuat data…'}</div>;
  const authoritiesByRole = new Map<number, number[]>();
  data.roleAuthorities.forEach(ra =>
    authoritiesByRole.set(ra.role_id, [...(authoritiesByRole.get(ra.role_id) || []), ra.authority_id]),
  );
  const counts: Partial<Record<Tab, number>> = {
    users: data.users.length,
    applications: data.applications.length,
    roles: data.roles.length,
    authorities: data.authorities.length,
  };
  const empty = (cols: number) => (
    <tr>
      <td colSpan={cols} className="um-empty">
        Belum ada data.
      </td>
    </tr>
  );

  return (
    <>
      <div className="um-head">
        <div>
          <h4>
            <i className="fas fa-shield-alt" />
            System Administration
          </h4>
          <small>Manage users, roles, authorities, and access control</small>
        </div>
        {fullName && (
          <div className="um-logged">
            Logged in as: <strong>{fullName}</strong>
          </div>
        )}
      </div>

      {error && (
        <div className="um-notice error" onClick={() => setError(null)}>
          {error}
        </div>
      )}
      {info && (
        <div className="um-notice ok" onClick={() => setInfo(null)}>
          {info}
        </div>
      )}

      <div className="um-card">
        <nav className="um-tabs" role="tablist">
          {TABS.map(t => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={tab === t.key ? 'active' : ''}
              onClick={() => setTab(t.key)}
            >
              <i className={`fas ${t.icon}`} /> {t.label}
              {counts[t.key] !== undefined && (
                <span className={`um-count ${t.key === 'authorities' ? 'primary' : ''}`}>
                  {counts[t.key]}
                </span>
              )}
            </button>
          ))}
        </nav>

        {tab === 'users' && (
          <UsersTab data={data} act={act} setDialog={setDialog} currentUserId={currentUserId} empty={empty} />
        )}

        {tab === 'applications' && (
          <ApplicationsTab data={data} act={act} setDialog={setDialog} empty={empty} />
        )}

        {tab === 'roles' && (
          <RolesTab
            data={data}
            act={act}
            setDialog={setDialog}
            authoritiesByRole={authoritiesByRole}
            empty={empty}
          />
        )}

        {tab === 'authorities' && (
          <AuthoritiesTab data={data} act={act} setDialog={setDialog} empty={empty} />
        )}

        {tab === 'audit' && <AuditTab data={data} empty={empty} />}

        {tab === 'sessions' && <SessionsTab data={data} act={act} empty={empty} />}
      </div>

      {dialog}
    </>
  );
}
