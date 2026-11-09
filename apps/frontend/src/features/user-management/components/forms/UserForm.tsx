/** Create / edit user dialog. */
import {Dialog} from '@/features/user-management/components/ui/Dialog';
import {Field} from '@/features/user-management/components/ui/Field';
import {Row} from '@/features/user-management/lib/types';

export function UserForm({
  user,
  onSave,
  onClose,
}: {
  user?: Row;
  onSave: (v: Row) => void;
  onClose: () => void;
}) {
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
    </Dialog>
  );
}
