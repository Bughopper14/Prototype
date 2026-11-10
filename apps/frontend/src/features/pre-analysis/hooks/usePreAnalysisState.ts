import {usePreAnalysisView} from '@/features/pre-analysis/hooks/usePreAnalysisView';
import {usePreviewSync} from '@/features/pre-analysis/hooks/usePreviewSync';
import {useRequiredMark} from '@/features/pre-analysis/hooks/useRequiredMark';
import {usePreAnalysisData} from '@/features/pre-analysis/hooks/usePreAnalysisData';
import {usePreAnalysisDerived} from '@/features/pre-analysis/hooks/usePreAnalysisDerived';
import {usePreAnalysisPersistence} from '@/features/pre-analysis/hooks/usePreAnalysisPersistence';
import {useSignatories} from '@/features/pre-analysis/hooks/useSignatories';
import {useSlikReviews} from '@/features/pre-analysis/hooks/useSlikReviews';
import {usePreviewActions} from '@/features/pre-analysis/hooks/usePreviewActions';
import {usePreAnalysisPrint} from '@/features/pre-analysis/hooks/usePreAnalysisPrint';
import type {PreAnalysisFormProps} from '@/features/pre-analysis/lib/types';

/** Composes every Pre-Analysis hook into the one state object the screen shares through context. */
export function usePreAnalysisState(props: PreAnalysisFormProps) {
  const view = usePreAnalysisView();
  const sync = usePreviewSync(view);
  const required = useRequiredMark();
  const form = usePreAnalysisData(props, view, sync);
  const derived = usePreAnalysisDerived(form);
  const persistence = usePreAnalysisPersistence(props, form);
  const signatories = useSignatories(view, sync, form);
  const slik = useSlikReviews(form, view, sync);
  const actions = usePreviewActions(signatories, view, sync);
  const print = usePreAnalysisPrint(view, form);

  return {
    props,
    ...view,
    ...sync,
    ...required,
    ...form,
    ...derived,
    ...persistence,
    ...signatories,
    ...slik,
    ...actions,
    ...print,
  };
}

export type PreAnalysisState = ReturnType<typeof usePreAnalysisState>;
