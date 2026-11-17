/** Create / edit department dialog. */
import {Dialog} from '@/features/user-management/components/ui/Dialog';
import {Field} from '@/features/user-management/components/ui/Field';
import {Row} from '@/features/user-management/lib/types';

export function DepartmentForm({
  department,
  onSave,
  onClose,
}: {
  department?: Row;
  onSave: (v: Row) => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      title={department ? 'Edit Department' : 'Add New Department'}
      onClose={onClose}
      onSubmit={f => {
        const data = Object.fromEntries(f);
        if (data.department_code) {
          data.department_code = String(data.department_code).trim().toUpperCase();
        }
        onSave(data);
      }}
    >
      <Field
        label="Department Code"
        name="department_code"
        defaultValue={department?.department_code || ''}
        placeholder="e.g. HR, MARKETING, IT"
        required
      />
      <Field
        label="Department Name"
        name="department_name"
        defaultValue={department?.department_name || ''}
        placeholder="e.g. Human Resources"
        required
      />
      <Field
        label="Description"
        name="description"
        defaultValue={department?.description || ''}
        placeholder="Department functions and responsibilities"
      />
    </Dialog>
  );
}
