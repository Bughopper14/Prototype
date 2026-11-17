/** Create / edit application (portal tile) dialog. */
import {Dialog} from '@/features/user-management/components/ui/Dialog';
import {Field} from '@/features/user-management/components/ui/Field';
import {Row} from '@/features/user-management/lib/types';

export function ApplicationForm({onSave, onClose}: {onSave: (v: Row) => void; onClose: () => void}) {
  return (
    <Dialog title="Add Application" onClose={onClose} onSubmit={f => onSave(Object.fromEntries(f))}>
      <Field label="Application Name" name="app_name" required />
      <Field label="URL Path" name="url_path" required />
      <Field label="Description" name="description" />
      <Field label="Icon Class" name="icon_class" defaultValue="fas fa-layer-group" />
    </Dialog>
  );
}
