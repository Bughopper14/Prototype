/** Section 4: equipment possibility of success. */
import {EquipmentFitFields} from '@/features/pre-analysis/components/form/equipment/EquipmentFitFields';
import {UnitCompositionField} from '@/features/pre-analysis/components/form/equipment/UnitCompositionField';
import {ExperienceFields} from '@/features/pre-analysis/components/form/equipment/ExperienceFields';
import {AccordionSection} from '@/features/pre-analysis/components/form/AccordionSection';

export function EquipmentSection() {
  return (
    <AccordionSection
      id="sec4"
      step="04"
      title="4. EQUIPMENT POSSIBILITY OF SUCCESS"
      contentStyle={{padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px'}}
    >
      <EquipmentFitFields />

      <UnitCompositionField />

      <ExperienceFields />
    </AccordionSection>
  );
}
