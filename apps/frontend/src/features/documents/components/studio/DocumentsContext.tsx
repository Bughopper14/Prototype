/** Shares Documents state with its sections so each section can live in its own file. */
import type {useDocumentsStudio} from '@/features/documents/hooks/useDocumentsStudio';
import {createContext, useContext} from 'react';

export type DocumentsStudio = ReturnType<typeof useDocumentsStudio>;

export const DocumentsContext = createContext<DocumentsStudio | null>(null);

export function useDocumentsStudioContext(): DocumentsStudio {
  const value = useContext(DocumentsContext);
  if (!value) throw new Error('useDocumentsStudioContext must be used inside Documents');
  return value;
}
