/** Labelled input used in user-management forms. */

export const Field = ({
  label,
  name,
  type = 'text',
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) => (
  <label className="pt-field">
    <span className="pt-form-label">{label}</span>
    <input className="pt-input" name={name} type={type} defaultValue={defaultValue} required={required} />
  </label>
);
