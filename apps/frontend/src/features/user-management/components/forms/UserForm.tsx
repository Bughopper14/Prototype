/** Create / edit user dialog. */
import {Dialog} from '@/features/user-management/components/ui/Dialog';
import {Field} from '@/features/user-management/components/ui/Field';
import {Overview, Row} from '@/features/user-management/lib/types';
import {useState} from 'react';

export function UserForm({
  user,
  data,
  departments,
  onSave,
  onClose,
}: {
  user?: Row;
  /** When given on a new user, the form also asks which role the user gets in each application. */
  data?: Overview;
  departments?: Row[];
  onSave: (v: Row) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<Record<number, string>>({});
  const deptList = departments || data?.departments || [];
  const authoritiesOf = (roleId: string) => {
    const ids = new Set(
      (data?.roleAuthorities || []).filter(ra => ra.role_id === Number(roleId)).map(ra => ra.authority_id),
    );
    return (data?.authorities || []).filter(a => ids.has(a.id)).map(a => a.authority_name);
  };
  return (
    <Dialog
      title={user ? 'Edit User' : 'Add User'}
      onClose={onClose}
      onSubmit={f => {
        const entries: Row = Object.fromEntries(f);
        entries.dept_id = entries.dept_id ? Number(entries.dept_id) : null;
        onSave(entries);
      }}
    >
      <Field label="Username" name="username" defaultValue={user?.username} required />
      <Field label="Full Name" name="full_name" defaultValue={user?.full_name} required />
      <Field label="Position" name="position" defaultValue={user?.position || 'Staff'} />
      <div className="pt-field">
        <label>
          <span className="pt-form-label">Department</span>
          <select
            className="pt-select"
            name="dept_id"
            defaultValue={user?.dept_id ? String(user.dept_id) : ''}
          >
            <option value="">— Unassigned —</option>
            {deptList.map(d => (
              <option key={d.dept_id} value={d.dept_id}>
                {d.department_code} - {d.department_name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Field label="Email" name="email" type="email" defaultValue={user?.email || ''} />
      <Field
        label={user ? 'New Password (leave blank to keep current)' : 'Password'}
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
                  <option value="">— No Access —</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.role_name}
                    </option>
                  ))}
                </select>
              </label>
              {picked[a.id] && (
                <small>
                  Authorities:{' '}
                  {authorities.length ? authorities.join(', ') : 'This role has no authorities yet'}
                </small>
              )}
            </div>
          );
        })}
    </Dialog>
  );
}
