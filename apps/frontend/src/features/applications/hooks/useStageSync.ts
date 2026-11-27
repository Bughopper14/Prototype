/** Keeps the active stage and tab in step with the application (and with the tab asked for by the parent). */
import {useEffect} from 'react';
import {
  initialScreen,
  isPreAnalysisApplication,
  isPreAnalysisReached,
} from '@/features/applications/lib/workspace/stage';
import {SCREEN} from '@/shared/master-data';

export function useStageSync({
  a,
  draft,
  tab,
  setTab,
  setActiveStage,
  initialTab,
}: {
  a: any;
  draft: any;
  tab: number;
  setTab: (v: number) => void;
  setActiveStage: (v: string) => void;
  initialTab?: number;
}) {
  useEffect(() => {
    setActiveStage(initialScreen(a));
    if (isPreAnalysisApplication(a) && tab === 0) setTab(8);
  }, [a.id, a.stage, a.status]);

  useEffect(() => {
    if (initialTab !== undefined) {
      setTab(initialTab);
      if (initialTab === 8) setActiveStage(SCREEN.PRE_ANALYSIS);
      else if ([0, 5, 1].includes(initialTab)) setActiveStage(SCREEN.FAP);
    }
  }, [initialTab, a.id]);
}
