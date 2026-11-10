import {PreAnalysisContext} from '@/features/pre-analysis/components/PreAnalysisContext';
import {FormColumn} from '@/features/pre-analysis/components/form/FormColumn';
import {PreviewColumn} from '@/features/pre-analysis/components/preview/PreviewColumn';
import {usePreAnalysisState} from '@/features/pre-analysis/hooks/usePreAnalysisState';
import type {PreAnalysisFormProps} from '@/features/pre-analysis/lib/types';

/** Pre-Analysis screen: the editable form on the left and the live document preview on the right. */
export function PreAnalysisForm(props: PreAnalysisFormProps) {
  const state = usePreAnalysisState(props);
  return (
    <PreAnalysisContext.Provider value={state}>
      <div
        className="fap-detail-split-container pre-analysis-container"
        style={{height: 'calc(100vh - 170px)', minHeight: '620px', overflow: 'hidden'}}
      >
        {/* LEFT COLUMN: 50% EDITABLE FORM */}
        <FormColumn />

        {/* RIGHT COLUMN: 50% LIVE DOCUMENT PREVIEW (DIGITAL TWIN 1:1 WITH PDF) */}
        <PreviewColumn />
      </div>
    </PreAnalysisContext.Provider>
  );
}
