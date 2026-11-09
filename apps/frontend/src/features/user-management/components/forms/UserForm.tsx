/** Create / edit user dialog. */
import {Dialog} from '@/features/user-management/components/ui/Dialog';
import {Field} from '@/features/user-management/components/ui/Field';
import {Overview, Row} from '@/features/user-management/lib/types';
import {useState} from 'react';

export function UserForm({
  user,
  data,
  onSave,
  onClose,
}: {
  user?: Row;
  /** When given on a new user, the form also asks which role the user gets in each application. */
  data?: Overview;
  onSave: (v: Row) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<Record<number, string>>({});
  const authoritiesOf = (roleId: string) => {
    const ids = new Set((data?.roleAuthorities || []).filter(ra => ra.role_id === Number(roleId)).map(ra => ra.authority_id));
    return (data?.authorities || []).filter(a => ids.has(a.id)).map(a => a.authority_name);
  };
  return (
    <Dialog
      title={user ? 'Edit user' : 'Tambah user'}
      onClose={onClose}
      onSubmit={f => onSave(Object.fromEntries(f))}
    >
      <Field label="Username" name="username" defaultValue={user?.username} required />
      <Field label="Nama lengkap" name="full_name" defaultValue={user?.full_name} required />
      <Field label="Posisi" name="position" defaultValue={user?.position || 'Staff'} />
      <Field label="Email" name="email" type="email" defaultValue={user?.email || ''} />
      <Field
        label={user ? 'Password baru (kosongkan jika tidak diubah)' : 'Password'}
        name="password"
        type="password"
        required={!user}
      />
      {!user &&
        data?.applications.map(a => {
          const roles = data.roles.filter(r => r.app_id === a.id);
          const authorities = picked[a.id] ? authoritiesOf(picked[a.id]) : [];
          return (
            <div key={a.id} className="pt-field">
              <label>
                <span className="pt-form-label">Role · {a.app_name}</span>
                <select
                  className="pt-select"
                  name={`access_${a.id}`}
                  value={picked[a.id] || ''}
                  onChange={e => setPicked({...picked, [a.id]: e.target.value})}
                >
                  <option value="">— tanpa akses —</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.role_name}
                    </option>
                  ))}
                </select>
              </label>
              {picked[a.id] && (
                <small>
                  Authorities: {authorities.length ? authorities.join(', ') : 'role ini belum punya authority'}
                </small>
              )}
            </div>
          );
        })}
    </Dialog>
  );
}
