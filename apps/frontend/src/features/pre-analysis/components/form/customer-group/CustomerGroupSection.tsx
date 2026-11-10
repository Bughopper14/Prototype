/** Section 3: customer and group background. */
import {CompanyBackgroundFields} from '@/features/pre-analysis/components/form/customer-group/CompanyBackgroundFields';
import {UboInformationField} from '@/features/pre-analysis/components/form/customer-group/UboInformationField';
import {MilestonesField} from '@/features/pre-analysis/components/form/customer-group/MilestonesField';
import {ExistingFincoBackupField} from '@/features/pre-analysis/components/form/customer-group/ExistingFincoBackupField';
import {AccordionSection} from '@/features/pre-analysis/components/form/AccordionSection';

export function CustomerGroupSection() {
  return (
    <AccordionSection
      id="sec3"
      step="03"
      title="3. CUSTOMER & GROUP BACKGROUND"
      contentStyle={{padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px'}}
    >
      <CompanyBackgroundFields />
      <UboInformationField />

      <MilestonesField />
      <ExistingFincoBackupField />
    </AccordionSection>
  );
}
