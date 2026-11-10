/** Shares StakeholderModalDialog state with its sections so each section can live in its own file. */
import type {useStakeholderModal} from '@/features/legal/hooks/useStakeholderModal';
import {createContext, useContext} from 'react';

export type StakeholderModal = ReturnType<typeof useStakeholderModal>;

export const StakeholderModalContext = createContext<StakeholderModal | null>(null);

export function useStakeholderModalContext(): StakeholderModal {
  const value = useContext(StakeholderModalContext);
  if (!value) throw new Error('useStakeholderModalContext must be used inside StakeholderModalDialog');
  return value;
}
