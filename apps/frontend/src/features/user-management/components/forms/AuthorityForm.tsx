/** Create / edit authority dialog. */
import {Dialog} from '@/features/user-management/components/ui/Dialog';
import {Field} from '@/features/user-management/components/ui/Field';
import {Overview, Row} from '@/features/user-management/lib/types';

export function AuthorityForm({
  data,
  onSave,
  onClose,
}: {
  data: Overview;
  onSave: (v: Row) => void;
  onClose: () => void;
}) {
  return (
    <Dialog title="Tambah authority" onClose={onClose} onSubmit={f => onSave(Object.fromEntries(f))}>
      <label className="pt-field">
        <span className="pt-form-label">Aplikasi</span>
        <select name="app_id" className="pt-select" required>
          {data.applications.map(a => (
            <option key={a.id} value={a.id}>
              {a.app_name}
            </option>
          ))}
        </select>
      </label>
      <Field label="Nama authority" name="authority_name" required />
      <Field label="Deskripsi" name="description" />
    </Dialog>
  );
}
