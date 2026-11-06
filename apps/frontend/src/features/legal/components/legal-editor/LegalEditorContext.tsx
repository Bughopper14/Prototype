/** Shares LegalEditor state with its sections so each section can live in its own file. */
import type {useLegalEditor} from '@/features/legal/hooks/useLegalEditor';
import {createContext, useContext} from 'react';

export type LegalEditor = ReturnType<typeof useLegalEditor>;

export const LegalEditorContext = createContext<LegalEditor | null>(null);

export function useLegalEditorContext(): LegalEditor {
  const value = useContext(LegalEditorContext);
  if (!value) throw new Error('useLegalEditorContext must be used inside LegalEditor');
  return value;
}
