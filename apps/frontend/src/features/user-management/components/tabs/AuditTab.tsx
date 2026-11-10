/** Audit log. */
import {fmt} from '@/features/user-management/lib/um-api';
import {SectionHead} from '@/features/user-management/components/ui/SectionHead';
import type {ReactNode} from 'react';
import type {Overview} from '@/features/user-management/lib/types';

export function AuditTab({data, empty}: {data: Overview; empty: (cols: number) => ReactNode}) {
  return (
    <>
      <SectionHead icon="fa-history" color="#64748b" title="Audit Logs" />
      <div className="um-table-wrap">
        <table className="um-table">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>User</th>
              <th>Aplikasi</th>
              <th>Aksi</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {data.audits.length === 0 && empty(5)}
            {data.audits.map(a => (
              <tr key={a.id}>
                <td>
                  <span className="um-muted">{fmt(a.timestamp)}</span>
                </td>
                <td>
                  <strong>{a.username || 'System'}</strong>
                </td>
                <td>
                  <span className="badge-app">{a.app_name}</span>
                </td>
                <td>
                  <small>{a.action}</small>
                </td>
                <td>
                  <span className="um-muted">{a.ip_address || '—'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
