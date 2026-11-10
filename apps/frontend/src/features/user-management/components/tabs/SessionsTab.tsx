/** Active and past sessions, with terminate. */
import {call} from '@/features/user-management/lib/um-api';
import {fmt} from '@/features/user-management/lib/um-api';
import {SectionHead} from '@/features/user-management/components/ui/SectionHead';
import type {ReactNode} from 'react';
import type {Overview} from '@/features/user-management/lib/types';

export function SessionsTab({
  data,
  act,
  empty,
}: {
  data: Overview;
  act: (work: () => Promise<{message?: string} | void>) => Promise<void>;
  empty: (cols: number) => ReactNode;
}) {
  return (
    <>
      <SectionHead icon="fa-sign-in-alt" color="#002c5f" title="Session Logs" />
      <div className="um-table-wrap">
        <table className="um-table">
          <thead>
            <tr>
              <th>Session ID</th>
              <th>User</th>
              <th>Aplikasi</th>
              <th>Login Time</th>
              <th>Aktivitas Terakhir</th>
              <th>Status / Logout Time</th>
              <th style={{width: 110}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.sessions.length === 0 && empty(7)}
            {data.sessions.map(s => {
              const active = !s.logout_time && !s.is_invalidated;
              return (
                <tr key={s.id}>
                  <td>
                    <code className="um-muted">{String(s.session_id || '').slice(0, 8)}...</code>
                  </td>
                  <td>
                    <strong>{s.username || '-'}</strong>
                  </td>
                  <td>
                    <span className="badge-app">{s.app_name || 'Portal Apps'}</span>
                  </td>
                  <td>
                    <small>{fmt(s.login_time)}</small>
                  </td>
                  <td>
                    <small>{fmt(s.last_activity)}</small>
                  </td>
                  <td>
                    {s.is_invalidated ? (
                      <span className="um-pill solid-danger">Force Logged Out</span>
                    ) : s.logout_time ? (
                      <small>{fmt(s.logout_time)}</small>
                    ) : (
                      <span className="um-pill solid-success">Active</span>
                    )}
                  </td>
                  <td>
                    {active ? (
                      <div className="um-actions">
                        <button
                          type="button"
                          className="um-btn danger-outline"
                          title="Hentikan Sesi Ini"
                          onClick={() => act(() => call(`/sessions/${s.session_id}/terminate`, 'POST', {}))}
                        >
                          <i className="fas fa-power-off" />
                          Terminate
                        </button>
                      </div>
                    ) : (
                      <span className="um-muted">—</span>
                    )}
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
