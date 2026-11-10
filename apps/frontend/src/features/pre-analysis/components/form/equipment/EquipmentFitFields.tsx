/** Equipment-to-job fit and utilization against the project duration. */
import {TextField} from '@/features/pre-analysis/components/form/fields/TextField';

export function EquipmentFitFields() {
  return (
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px'}}>
      <TextField name="equipmentJobFit" label="Equipment-to-Job Fit" />
      <TextField name="utilizationDuration" label="Utilization vs Project Duration" />
    </div>
  );
}
