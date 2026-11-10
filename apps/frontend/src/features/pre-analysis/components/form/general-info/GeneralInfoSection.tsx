/** Section 1: general information. */
import {DocumentIdentityFields} from '@/features/pre-analysis/components/form/general-info/DocumentIdentityFields';
import {LeadAndContactFields} from '@/features/pre-analysis/components/form/general-info/LeadAndContactFields';
import {FinancialStandingFields} from '@/features/pre-analysis/components/form/general-info/FinancialStandingFields';
import {AccordionSection} from '@/features/pre-analysis/components/form/AccordionSection';

export function GeneralInfoSection() {
  return (
    <AccordionSection
      id="sec1"
      step="01"
      title="1. GENERAL INFORMATION"
      contentStyle={{padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px'}}
    >
      <DocumentIdentityFields />
      <LeadAndContactFields />
      <FinancialStandingFields />
    </AccordionSection>
  );
}
