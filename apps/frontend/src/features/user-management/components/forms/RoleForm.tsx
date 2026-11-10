/** Create / edit role dialog with its authorities. */
import {Dialog} from '@/features/user-management/components/ui/Dialog';
import {Field} from '@/features/user-management/components/ui/Field';
import {Overview, Row} from '@/features/user-management/lib/types';
import {useState} from 'react';

export function RoleForm({
  data,
  role,
  selected = [],
  onSave,
  onClose,
}: {
  data: Overview;
  role?: Row;
  selected?: number[];
  onSave: (v: Row) => void;
  onClose: () => void;
}) {
  const [appId, setAppId] = useState<number>(role?.app_id ?? data.applications[0]?.id);
  return (
    <Dialog
      title={role ? 'Edit role' : 'Tambah role'}
      onClose={onClose}
      onSubmit={f =>
        onSave({
          app_id: appId,
          role_name: f.get('role_name'),
          description: f.get('description'),
          authorities: f.getAll('authorities').map(Number),
        })
      }
    >
      {!role && (
        <label className="pt-field">
          <span className="pt-form-label">Aplikasi</span>
          <select className="pt-select" value={appId} onChange={e => setAppId(Number(e.target.value))}>
            {data.applications.map(a => (
              <option key={a.id} value={a.id}>
                {a.app_name}
              </option>
            ))}
          </select>
        </label>
      )}
      <Field label="Nama role" name="role_name" defaultValue={role?.role_name} required />
      <Field label="Deskripsi" name="description" defaultValue={role?.description || ''} />
      <div className="pt-field">
        <span className="pt-form-label">Authorities</span>
        <div className="pt-checks">
          {data.authorities
            .filter(a => a.app_id === appId)
            .map(a => (
              <label key={a.id}>
                <input
                  type="checkbox"
                  name="authorities"
                  value={a.id}
                  defaultChecked={selected.includes(a.id)}
                />{' '}
                {a.authority_name}
              </label>
            ))}
        </div>
      </div>
    </Dialog>
  );
}
