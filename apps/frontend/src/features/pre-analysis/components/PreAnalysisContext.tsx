import type {PreAnalysisState} from '@/features/pre-analysis/hooks/usePreAnalysisState';
import {createContext, useContext} from 'react';

/** Shares the Pre-Analysis state with every section of the form and of the preview. */
export const PreAnalysisContext = createContext<PreAnalysisState | null>(null);

export function usePreAnalysisContext(): PreAnalysisState {
  const value = useContext(PreAnalysisContext);
  if (!value) throw new Error('usePreAnalysisContext must be used inside PreAnalysisForm');
  return value;
}
