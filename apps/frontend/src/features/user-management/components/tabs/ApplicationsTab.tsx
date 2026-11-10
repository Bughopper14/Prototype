/** Applications registered in the portal. */
import {ApplicationForm} from '@/features/user-management/components/forms/ApplicationForm';
import {call} from '@/features/user-management/lib/um-api';
import {SectionHead} from '@/features/user-management/components/ui/SectionHead';
import {AddButton} from '@/features/user-management/components/ui/AddButton';
import type {ReactNode} from 'react';
import type {Overview} from '@/features/user-management/lib/types';

export function ApplicationsTab({
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
        icon="fa-layer-group"
        color="#0dcaf0"
        title="Master Aplikasi"
        action={
          <AddButton
            label="Tambah Aplikasi"
            onClick={() =>
              setDialog(
                <ApplicationForm
                  onSave={v => act(() => call('/applications', 'POST', v))}
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
              <th>App Name</th>
              <th>URL Path</th>
              <th>Description</th>
              <th style={{width: 80}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.applications.length === 0 && empty(4)}
            {data.applications.map(a => (
              <tr key={a.id}>
                <td>
                  <i
                    className={a.icon_class || 'fas fa-layer-group'}
                    style={{color: '#002c5f', marginRight: 8}}
                  />
                  <strong>{a.app_name}</strong>
                </td>
                <td>
                  <code>{a.url_path}</code>
                </td>
                <td>
                  <span className="um-muted">{a.description}</span>
                </td>
                <td>
                  <div className="um-actions">
                    <button
                      type="button"
                      className="um-btn danger"
                      aria-label={`Hapus ${a.app_name}`}
                      onClick={() =>
                        confirm(`Hapus aplikasi ${a.app_name}?`) &&
                        act(() => call(`/applications/${a.id}`, 'DELETE'))
                      }
                    >
                      <i className="fas fa-trash" />
                    </button>
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
