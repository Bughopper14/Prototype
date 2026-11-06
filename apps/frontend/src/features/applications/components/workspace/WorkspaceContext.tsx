/** Shares ApplicationWorkspace state with its sections so each section can live in its own file. */
import type {useApplicationWorkspace} from '@/features/applications/hooks/useApplicationWorkspace';
import {createContext, useContext} from 'react';

export type ApplicationWorkspace = ReturnType<typeof useApplicationWorkspace>;

export const WorkspaceContext = createContext<ApplicationWorkspace | null>(null);

export function useWorkspace(): ApplicationWorkspace {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used inside ApplicationWorkspace');
  return value;
}
