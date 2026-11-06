import {getStaticAssetUrl} from '@/features/pre-analysis/lib/text';

import {PreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';
import {CustomerGroupSection} from '@/features/pre-analysis/components/form/CustomerGroupSection';
import {DealerCrossCheckSection} from '@/features/pre-analysis/components/form/DealerCrossCheckSection';
import {DeliveryQaSection} from '@/features/pre-analysis/components/form/DeliveryQaSection';
import {EquipmentSection} from '@/features/pre-analysis/components/form/EquipmentSection';
import {ExpertJudgementSection} from '@/features/pre-analysis/components/form/ExpertJudgementSection';
import {FormActionHeader} from '@/features/pre-analysis/components/form/FormActionHeader';
import {GeneralInfoSection} from '@/features/pre-analysis/components/form/GeneralInfoSection';
import {ProjectInfoSection} from '@/features/pre-analysis/components/form/ProjectInfoSection';
import {CompetitionPreview} from '@/features/pre-analysis/components/preview/CompetitionPreview';
import {CustomerGroupPreview} from '@/features/pre-analysis/components/preview/CustomerGroupPreview';
import {DealerCrossCheckPreview} from '@/features/pre-analysis/components/preview/DealerCrossCheckPreview';
import {DeliveryQaPreview} from '@/features/pre-analysis/components/preview/DeliveryQaPreview';
import {EquipmentPreview} from '@/features/pre-analysis/components/preview/EquipmentPreview';
import {ExpertJudgementPreview} from '@/features/pre-analysis/components/preview/ExpertJudgementPreview';
import {GeneralInfoPreview} from '@/features/pre-analysis/components/preview/GeneralInfoPreview';
import {PreviewDocHeader} from '@/features/pre-analysis/components/preview/PreviewDocHeader';
import {PreviewToolbar} from '@/features/pre-analysis/components/preview/PreviewToolbar';
import {ProjectInfoPreview} from '@/features/pre-analysis/components/preview/ProjectInfoPreview';
import {RecommendationPreview} from '@/features/pre-analysis/components/preview/RecommendationPreview';
import {SignOffPreview} from '@/features/pre-analysis/components/preview/SignOffPreview';
import {SuggestionsPreview} from '@/features/pre-analysis/components/preview/SuggestionsPreview';
import {
  usePreAnalysisState,
  type PreAnalysisFormProps,
} from '@/features/pre-analysis/hooks/usePreAnalysisState';

export function PreAnalysisForm(props: PreAnalysisFormProps) {
  const state = usePreAnalysisState(props);
  const {viewMode, zoomLevel, pdfIframeRef} = state;
  return (
    <PreAnalysisContext.Provider value={state}>
      <div
        className="fap-detail-split-container pre-analysis-container"
        style={{height: 'calc(100vh - 170px)', minHeight: '620px', overflow: 'hidden'}}
      >
        {/* LEFT COLUMN: 50% EDITABLE FORM */}
        <div
          className="fap-detail-form-col"
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
          <div
            className="fap-accordion-group"
            style={{display: 'flex', flexDirection: 'column', gap: '12px'}}
          >
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

        {/* RIGHT COLUMN: 50% LIVE DOCUMENT PREVIEW (DIGITAL TWIN 1:1 WITH PDF) */}
        <div
          className="fap-detail-preview-col"
          style={{
            flex: '1 1 50%',
            width: '50%',
            minWidth: 0,
            height: '100%',
            maxHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            overflow: 'hidden',
          }}
        >
          {/* Ribbon Toolbar */}
          <PreviewToolbar />

          {/* Viewport Canvas */}
          <div
            className="pre-analysis-canvas"
            style={{
              flex: 1,
              height: 'calc(100% - 42px)',
              overflowY: 'auto',
              overflowX: 'auto',
              background: '#f1f5f9',
              padding: '16px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
            }}
          >
            {viewMode === 'original-pdf' ? (
              <iframe
                ref={pdfIframeRef}
                src={`${getStaticAssetUrl('pre_analysis/pre_analysis_sample.pdf')}#toolbar=1`}
                title="Original Pre-Analysis PDF"
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: '700px',
                  border: 'none',
                  borderRadius: '4px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                }}
              />
            ) : (
              /* Digital Twin Document Render */
              <div
                id="preana-digital-twin-doc"
                className="pre-analysis-digital-twin-doc"
                style={{
                  width: '840px',
                  minWidth: '840px',
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

                {/* SECTION 7: 7. EXPERT JUDGEMENT CONCLUSION */}
                <ExpertJudgementPreview />

                {/* Recommendation Callout */}
                <RecommendationPreview />

                {/* Suggestion Bullet Points */}
                <SuggestionsPreview />

                {/* Competition Information Table */}
                <CompetitionPreview />

                {/* Approvals / Sign-off Footer - Widened & Formal Executive Format */}
                <SignOffPreview />
              </div>
            )}
          </div>
        </div>
      </div>
    </PreAnalysisContext.Provider>
  );
}
