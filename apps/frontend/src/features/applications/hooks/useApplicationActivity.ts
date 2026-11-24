/** Activity feed of this application: live sync, read markers, jump to the changed section. */
import {
  ACTIVITY_EVENT,
  fetchApplicationActivities,
  getReadActivityIds,
  saveReadActivityIds,
} from '@/features/activity/lib/activity-store';
import {SCREEN} from '@/shared/master-data';
import {useEffect, useMemo} from 'react';

export function useApplicationActivity({
  activeStage,
  setActiveStage,
  setTab,
  setError,
  isPreAnalysisReached,
  localActivities,
  setLocalActivities,
  setLocalReadIds,
  a,
  notify,
}: {
  activeStage: string;
  setActiveStage: React.Dispatch<React.SetStateAction<string>>;
  setTab: React.Dispatch<React.SetStateAction<number>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
  isPreAnalysisReached: boolean;
  localActivities: import('@/features/activity/lib/types').SystemActivity[];
  setLocalActivities: React.Dispatch<
    React.SetStateAction<import('@/features/activity/lib/types').SystemActivity[]>
  >;
  setLocalReadIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  a: any;
  notify: (s: string) => void;
}) {
  // The application's feed comes from the server (crm_application_activity_logs), refreshed after each recorded change.
  useEffect(() => {
    // A new application has no activity until it is saved
    if (!a.id || a.isNew) return;
    let live = true;
    const load = () =>
      fetchApplicationActivities(String(a.id))
        .then(list => live && setLocalActivities(list))
        .catch(() => {});
    const handleActivitySync = () => {
      load();
      setLocalReadIds(getReadActivityIds());
    };
    load();
    window.addEventListener(ACTIVITY_EVENT, handleActivitySync);
    return () => {
      live = false;
      window.removeEventListener(ACTIVITY_EVENT, handleActivitySync);
    };
  }, [a.id]);

  // Workflow moves are logged by the server too, so the feed already holds them (no merge with approvalLogs).
  const applicationActivities = useMemo(
    () => [...localActivities].sort((x, y) => new Date(y.timestamp).getTime() - new Date(x.timestamp).getTime()),
    [localActivities],
  );

  const handleMarkAppActivityRead = (id: string) => {
    setLocalReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      saveReadActivityIds(next);
      return next;
    });
  };

  const handleMarkAllAppActivitiesRead = () => {
    setLocalReadIds(prev => {
      const next = new Set(prev);
      for (const act of applicationActivities) {
        next.add(act.id);
      }
      saveReadActivityIds(next);
      return next;
    });
    notify('All activities for this application marked as seen');
  };

  const handleOpenSectionFromActivity = (_appId: string, targetTabIndex?: number) => {
    if (targetTabIndex !== undefined) {
      if (targetTabIndex === 8) {
        setActiveStage(SCREEN.PRE_ANALYSIS);
      } else if ([0, 5, 1].includes(targetTabIndex)) {
        if (activeStage !== SCREEN.FAP && !isPreAnalysisReached) {
          setActiveStage(SCREEN.FAP);
        }
      } else if ([2, 4].includes(targetTabIndex)) {
        setActiveStage(SCREEN.PRE_ANALYSIS);
      }
      setTab(targetTabIndex);
      setError('');
    }
  };

  return {
    applicationActivities,
    handleMarkAppActivityRead,
    handleMarkAllAppActivitiesRead,
    handleOpenSectionFromActivity,
  };
}
