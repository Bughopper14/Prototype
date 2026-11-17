/** Dialog to quickly assign, move, or remove a user to/from a department. */
import {Dialog} from '@/features/user-management/components/ui/Dialog';
import {Row} from '@/features/user-management/lib/types';
import {useState} from 'react';

export function AssignDepartmentDialog({
  users,
  departments,
  initialUserId,
  initialDeptId,
  title,
  onSave,
  onClose,
}: {
  users: Row[];
  departments: Row[];
  initialUserId?: number;
  initialDeptId?: number;
  title?: string;
  onSave: (payload: {userId: number; dept_id: number | null}) => void;
  onClose: () => void;
}) {
  const [userId, setUserId] = useState<number>(initialUserId || users[0]?.id || 0);
  const [deptId, setDeptId] = useState<string>(
    initialDeptId !== undefined ? String(initialDeptId) : ''
  );

  const selectedUser = users.find(u => u.id === userId);

  return (
    <Dialog
      title={title || 'Move / Reassign User Department'}
      onClose={onClose}
      onSubmit={() => {
        if (!userId) return;
        onSave({
          userId,
          dept_id: deptId && deptId !== 'none' ? Number(deptId) : null,
        });
      }}
    >
      <div className="pt-field">
        <label>
          <span className="pt-form-label">Select User</span>
          <select
            className="pt-select"
            value={userId}
            onChange={e => setUserId(Number(e.target.value))}
            required
          >
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.full_name || u.username} ({u.username}){' '}
                {u.department_name
                  ? `— Department: ${u.department_name}`
                  : '— [Unassigned]'}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedUser && (
        <div
          style={{
            margin: '-4px 0 14px',
            padding: '8px 12px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{color: '#64748b'}}>Current Department:</span>
          {selectedUser.department_name ? (
            <span
              className="badge-position"
              style={{
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                borderColor: '#bfdbfe',
                fontWeight: 600,
                fontSize: '0.8rem',
              }}
            >
              {selectedUser.department_code || selectedUser.department_name}
            </span>
          ) : (
            <span
              style={{
                color: '#e11d48',
                fontWeight: 600,
                fontSize: '0.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <i className="fas fa-exclamation-circle" /> No Department Assigned
            </span>
          )}
        </div>
      )}

      <div className="pt-field">
        <label>
          <span className="pt-form-label">Target Department</span>
          <select
            className="pt-select"
            value={deptId}
            onChange={e => setDeptId(e.target.value)}
          >
            <option value="">— Select Target Department —</option>
            {departments.map(d => (
              <option key={d.dept_id} value={d.dept_id}>
                {d.department_code} - {d.department_name}
              </option>
            ))}
            <option value="none" style={{color: '#dc2626'}}>
              ✕ Remove from Department (Set as Unassigned)
            </option>
          </select>
        </label>
        <small style={{color: '#64748b', marginTop: 4, display: 'block'}}>
          Select destination department to transfer user, or select release option to set as unassigned.
        </small>
      </div>
    </Dialog>
  );
}
