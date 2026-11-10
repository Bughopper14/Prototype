/** Per-user application access dialog. */
import {Dialog} from '@/features/user-management/components/ui/Dialog';
import {Row} from '@/features/user-management/lib/types';
import {call} from '@/features/user-management/lib/um-api';
import {useEffect, useState} from 'react';

export function PermissionsDialog({
  userId,
  name,
  onSave,
  onClose,
}: {
  userId: number;
  name: string;
  onSave: (v: Row) => void;
  onClose: () => void;
}) {
  const [state, setState] = useState<{
    applications: Row[];
    currentPermissions: Record<string, number>;
    roles: Row[];
  } | null>(null);
  useEffect(() => {
    call(`/users/${userId}/permissions`).then(setState);
  }, [userId]);
  return (
    <Dialog
      title={`Akses · ${name}`}
      onClose={onClose}
      onSubmit={f => onSave(Object.fromEntries([...f.entries()].map(([k, v]) => [k, v || null])))}
    >
      {!state ? (
        <p>Memuat…</p>
      ) : (
        state.applications.map(a => (
          <label key={a.id} className="pt-field">
            <span className="pt-form-label">{a.app_name}</span>
            <select
              className="pt-select"
              name={String(a.id)}
              defaultValue={state.currentPermissions[a.id] ?? ''}
            >
              <option value="">— tanpa akses —</option>
              {state.roles
                .filter(r => r.app_id === a.id)
                .map(r => (
                  <option key={r.id} value={r.id}>
                    {r.role_name}
                  </option>
                ))}
            </select>
          </label>
        ))
      )}
    </Dialog>
  );
}
