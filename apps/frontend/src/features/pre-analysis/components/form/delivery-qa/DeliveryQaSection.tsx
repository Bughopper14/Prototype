/** Section 5: unit delivery status and QA check. */
import {DeliveryStatusFields} from '@/features/pre-analysis/components/form/delivery-qa/DeliveryStatusFields';
import {QaIlinkCommentField} from '@/features/pre-analysis/components/form/delivery-qa/QaIlinkCommentField';
import {QaConclusionField} from '@/features/pre-analysis/components/form/delivery-qa/QaConclusionField';
import {AccordionSection} from '@/features/pre-analysis/components/form/AccordionSection';

export function DeliveryQaSection() {
  return (
    <AccordionSection
      id="sec5"
      step="05"
      title="5. UNIT DELIVERY STATUS & QA CHECK"
      contentStyle={{padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px'}}
    >
      <DeliveryStatusFields />
      <QaIlinkCommentField />
      <QaConclusionField />
    </AccordionSection>
  );
}
