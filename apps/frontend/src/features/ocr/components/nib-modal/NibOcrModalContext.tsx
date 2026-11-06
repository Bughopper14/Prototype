/** Shares NibOcrModal state with its sections so each section can live in its own file. */
import type {useNibOcrModal} from '@/features/ocr/hooks/useNibOcrModal';
import {createContext, useContext} from 'react';

export type NibOcrModal = ReturnType<typeof useNibOcrModal>;

export const NibOcrModalContext = createContext<NibOcrModal | null>(null);

export function useNibOcrModalContext(): NibOcrModal {
  const value = useContext(NibOcrModalContext);
  if (!value) throw new Error('useNibOcrModalContext must be used inside NibOcrModal');
  return value;
}
