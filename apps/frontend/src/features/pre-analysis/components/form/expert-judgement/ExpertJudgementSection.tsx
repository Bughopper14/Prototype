/** Section 7: expert judgement conclusion. */
import {GoodProjectCustomerToggles} from '@/features/pre-analysis/components/form/expert-judgement/GoodProjectCustomerToggles';
import {RecommendationField} from '@/features/pre-analysis/components/form/expert-judgement/RecommendationField';
import {SuggestionsEditor} from '@/features/pre-analysis/components/form/expert-judgement/SuggestionsEditor';
import {CompetitionTableEditor} from '@/features/pre-analysis/components/form/expert-judgement/CompetitionTableEditor';
import {SignOffEditor} from '@/features/pre-analysis/components/form/expert-judgement/SignOffEditor';
import {AccordionSection} from '@/features/pre-analysis/components/form/AccordionSection';

export function ExpertJudgementSection() {
  return (
    <AccordionSection
      id="sec7"
      step="07"
      title="7. PRELIMENARY ASSESSMENT"
      highlight
      contentStyle={{padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px'}}
    >
      <GoodProjectCustomerToggles />

      <RecommendationField />

      <SuggestionsEditor />

      <CompetitionTableEditor />

      <SignOffEditor />
    </AccordionSection>
  );
}
