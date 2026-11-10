/** The Pre-Analysis document rendered 1:1 with the PDF, from the data being edited. */
import {PreviewDocHeader} from '@/features/pre-analysis/components/preview/PreviewDocHeader';
import {GeneralInfoPreview} from '@/features/pre-analysis/components/preview/GeneralInfoPreview';
import {ProjectInfoPreview} from '@/features/pre-analysis/components/preview/ProjectInfoPreview';
import {CustomerGroupPreview} from '@/features/pre-analysis/components/preview/CustomerGroupPreview';
import {EquipmentPreview} from '@/features/pre-analysis/components/preview/EquipmentPreview';
import {DeliveryQaPreview} from '@/features/pre-analysis/components/preview/DeliveryQaPreview';
import {DealerCrossCheckPreview} from '@/features/pre-analysis/components/preview/DealerCrossCheckPreview';
import {ExpertJudgementPreview} from '@/features/pre-analysis/components/preview/ExpertJudgementPreview';
import {RecommendationPreview} from '@/features/pre-analysis/components/preview/RecommendationPreview';
import {SuggestionsPreview} from '@/features/pre-analysis/components/preview/SuggestionsPreview';
import {CompetitionPreview} from '@/features/pre-analysis/components/preview/CompetitionPreview';
import {SignOffPreview} from '@/features/pre-analysis/components/preview/SignOffPreview';
import {usePreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';

export function DigitalTwinDocument() {
  const {zoomLevel} = usePreAnalysisContext();
  return (
    <div
      id="preana-digital-twin-doc"
      className="pre-analysis-digital-twin-doc"
      style={{
        width: '840px',
        minWidth: '840px',
        margin: '0 auto',
        zoom: zoomLevel,
        background: '#ffffff',
        boxShadow: '0 4px 24px rgba(15, 23, 42, 0.12)',
        border: '1px solid #cbd5e1',
        padding: '36px 40px',
        fontFamily: 'Calibri, Arial, sans-serif',
        color: '#000000',
        boxSizing: 'border-box',
      }}
    >
      {/* Document Header */}
      <PreviewDocHeader />

      {/* Top Thick Navy Divider */}
      <div style={{height: '3px', background: '#1b365d', marginBottom: '8px'}} />

      {/* SECTION 1: 1. GENERAL INFORMATION TABLE */}
      <GeneralInfoPreview />

      {/* SECTION 2: 2. PROJECT INFORMATION */}
      <ProjectInfoPreview />

      {/* SECTION 3: 3. CUSTOMER & GROUP BACKGROUND */}
      <CustomerGroupPreview />

      {/* SECTION 4: 4. EQUIPMENT POSSIBILITY OF SUCCESS */}
      <EquipmentPreview />

      {/* SECTION 5: 5. UNIT DELIVERY STATUS & QA CHECK */}
      <DeliveryQaPreview />

      {/* SECTION 6: 6. CROSS-CHECK WITH DEALER / LMI (quick) */}
      <DealerCrossCheckPreview />

      {/* SECTION 7: 7. PRELIMENARY ASSESSMENT */}
      <ExpertJudgementPreview />

      {/* Recommendation Callout */}
      <RecommendationPreview />

      {/* Suggestion Bullet Points */}
      <SuggestionsPreview />

      {/* Competition Information Table */}
      <CompetitionPreview />

      {/* Approvals / Sign-off Footer - Multi-row with max 3 per row */}
      <SignOffPreview />
    </div>
  );
}
