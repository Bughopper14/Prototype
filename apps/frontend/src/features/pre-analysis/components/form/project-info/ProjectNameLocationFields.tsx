/** Project name and location. */
import {TextField} from '@/features/pre-analysis/components/form/fields/TextField';

export function ProjectNameLocationFields() {
  return (
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px'}}>
      <TextField name="projectName" label="Project Name" emptyIfMissing />
      <TextField name="projectLocation" label="Project Location" emptyIfMissing />
    </div>
  );
}
