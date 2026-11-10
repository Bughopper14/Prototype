/** Prior LiuGong experience and service agreement / FMC. */
import {TextField} from '@/features/pre-analysis/components/form/fields/TextField';

export function ExperienceFields() {
  return (
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px'}}>
      <TextField name="priorLiugongExperience" label="Prior LiuGong Experience" />
      <TextField name="serviceAgreementFmc" label="Have Service Agreement / FMC" />
    </div>
  );
}
