/** Section 2: project information. */
import {ProjectNameLocationFields} from '@/features/pre-analysis/components/form/project-info/ProjectNameLocationFields';
import {ProjectGroupLists} from '@/features/pre-analysis/components/form/project-info/ProjectGroupLists';
import {CustomerRoleFields} from '@/features/pre-analysis/components/form/project-info/CustomerRoleFields';
import {ProjectStatusField} from '@/features/pre-analysis/components/form/project-info/ProjectStatusField';
import {InvestmentPlanField} from '@/features/pre-analysis/components/form/project-info/InvestmentPlanField';
import {FinancingSchemeField} from '@/features/pre-analysis/components/form/project-info/FinancingSchemeField';
import {AccordionSection} from '@/features/pre-analysis/components/form/AccordionSection';

export function ProjectInfoSection() {
  return (
    <AccordionSection
      id="sec2"
      step="02"
      title="2. PROJECT INFORMATION"
      contentStyle={{padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px'}}
    >
      <ProjectNameLocationFields />

      <ProjectGroupLists />

      <CustomerRoleFields />

      <ProjectStatusField />

      <InvestmentPlanField />
      <FinancingSchemeField />
    </AccordionSection>
  );
}
