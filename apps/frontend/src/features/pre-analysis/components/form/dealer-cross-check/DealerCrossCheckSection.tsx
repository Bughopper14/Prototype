/** Section 6: cross-check with the dealer / LMI. */
import {DealerVerificationFields} from '@/features/pre-analysis/components/form/dealer-cross-check/DealerVerificationFields';
import {EntitySlikReviews} from '@/features/pre-analysis/components/form/dealer-cross-check/EntitySlikReviews';
import {AccordionSection} from '@/features/pre-analysis/components/form/AccordionSection';

export function DealerCrossCheckSection() {
  return (
    <AccordionSection
      id="sec6"
      step="06"
      title="6. CROSS-CHECK WITH DEALER / LMI (quick)"
      contentStyle={{padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px'}}
    >
      <DealerVerificationFields />
      <EntitySlikReviews />
    </AccordionSection>
  );
}
