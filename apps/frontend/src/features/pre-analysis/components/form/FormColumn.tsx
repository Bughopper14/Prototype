/** Left half of the screen: the action header and the seven collapsible sections of the form. */
import {FormActionHeader} from '@/features/pre-analysis/components/form/FormActionHeader';
import {GeneralInfoSection} from '@/features/pre-analysis/components/form/general-info/GeneralInfoSection';
import {ProjectInfoSection} from '@/features/pre-analysis/components/form/project-info/ProjectInfoSection';
import {CustomerGroupSection} from '@/features/pre-analysis/components/form/customer-group/CustomerGroupSection';
import {EquipmentSection} from '@/features/pre-analysis/components/form/equipment/EquipmentSection';
import {DeliveryQaSection} from '@/features/pre-analysis/components/form/delivery-qa/DeliveryQaSection';
import {DealerCrossCheckSection} from '@/features/pre-analysis/components/form/dealer-cross-check/DealerCrossCheckSection';
import {ExpertJudgementSection} from '@/features/pre-analysis/components/form/expert-judgement/ExpertJudgementSection';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function FormColumn() {
  const {isInitialMountRef, highlightElement} = usePreAnalysisContext();
  return (
    <div
      className="fap-detail-form-col"
      onFocusCapture={e => {
        if (isInitialMountRef.current) return;
        const target = e.target as HTMLElement;
        if (target && target.matches('input, textarea, select, button, [data-field]')) {
          const formEl = (target.closest('[data-field]') as HTMLElement) || target;
          highlightElement(formEl);
        }
      }}
      onClickCapture={e => {
        if (isInitialMountRef.current) return;
        const target = e.target as HTMLElement;
        if (target && target.matches('input, textarea, select, button, [data-field]')) {
          const formEl = (target.closest('[data-field]') as HTMLElement) || target;
          highlightElement(formEl);
        }
      }}
      style={{
        flex: '1 1 50%',
        width: '50%',
        minWidth: 0,
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingRight: '8px',
      }}
    >
      {/* Sticky Action Header */}
      <FormActionHeader />

      {/* ACCORDION SECTIONS 1 TO 7 */}
      <div className="fap-accordion-group" style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
        {/* SECTION 1: 1. GENERAL INFORMATION */}
        <GeneralInfoSection />

        {/* SECTION 2: 2. PROJECT INFORMATION */}
        <ProjectInfoSection />

        {/* SECTION 3: 3. CUSTOMER & GROUP BACKGROUND */}
        <CustomerGroupSection />

        {/* SECTION 4: 4. EQUIPMENT POSSIBILITY OF SUCCESS */}
        <EquipmentSection />

        {/* SECTION 5: 5. UNIT DELIVERY STATUS & QA CHECK */}
        <DeliveryQaSection />

        {/* SECTION 6: 6. CROSS-CHECK WITH DEALER / LMI (quick) */}
        <DealerCrossCheckSection />

        {/* SECTION 7: 7. EXPERT JUDGEMENT CONCLUSION */}
        <ExpertJudgementSection />
      </div>
    </div>
  );
}
