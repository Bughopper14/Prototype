/** Shares PreAnalysisForm state with its sections so each section can live in its own file. */
import type {usePreAnalysisState} from '@/features/pre-analysis/hooks/usePreAnalysisState';
import {createContext, useContext} from 'react';

export type PreAnalysisState = ReturnType<typeof usePreAnalysisState>;

export const PreAnalysisContext = createContext<PreAnalysisState | null>(null);

export function usePreAnalysis(): PreAnalysisState {
  const value = useContext(PreAnalysisContext);
  if (!value) throw new Error('usePreAnalysis must be used inside PreAnalysisForm');
  return value;
}
