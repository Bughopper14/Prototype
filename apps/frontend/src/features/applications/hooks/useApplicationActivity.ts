/** Activity feed of this application: live sync, read markers, jump to the changed section. */
import {
  getReadActivityIds,
  getStoredActivities,
  saveReadActivityIds,
} from '@/features/activity/lib/activity-store';
import {type SystemActivity} from '@/features/activity/lib/types';
import {statusLabel} from '@/shared/lib/format';
import {useEffect, useMemo} from 'react';

export function useApplicationActivity({
  activeStage,
  setActiveStage,
  setTab,
  draft,
  setError,
  liveCompanyName,
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
  draft: any;
  setError: React.Dispatch<React.SetStateAction<string>>;
  liveCompanyName: string;
  isPreAnalysisReached: boolean;
  localActivities: import('@/features/activity/lib/types').SystemActivity[];
  setLocalActivities: React.Dispatch<
    React.SetStateAction<import('@/features/activity/lib/types').SystemActivity[]>
  >;
  setLocalReadIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  a: any;
  notify: (s: string) => void;
}) {
  useEffect(() => {
    const handleActivitySync = () => {
      setLocalActivities(getStoredActivities());
      setLocalReadIds(getReadActivityIds());
    };
    window.addEventListener('crm-activity-state-change', handleActivitySync);
    return () => {
      window.removeEventListener('crm-activity-state-change', handleActivitySync);
    };
  }, []);

  const applicationActivities = useMemo(() => {
    const currentAppId = String(a.id || '');
    const currentFapNo = String(a.fapNumber || '')
      .trim()
      .toLowerCase();
    const currentCompanyName = String(
      a.customer?.companyName || draft.customer?.companyName || liveCompanyName || '',
    )
      .trim()
      .toLowerCase();

    const matched = localActivities.filter(act => {
      if (act.applicationId && String(act.applicationId) === currentAppId) return true;
      if (act.fapNumber && currentFapNo && String(act.fapNumber).trim().toLowerCase() === currentFapNo)
        return true;
      if (!act.applicationId && !act.fapNumber && act.companyName && currentCompanyName) {
        if (String(act.companyName).trim().toLowerCase() === currentCompanyName) return true;
      }
      return false;
    });

    const existingTitles = new Set(matched.map(m => `${m.title}_${m.timestamp}`));
    const workflowLogs: SystemActivity[] = (a.approvalLogs || [])
      .map((l: any, idx: number) => {
        const timestamp = l.actionTimestamp
          ? new Date(l.actionTimestamp).toISOString()
          : new Date().toISOString();
        const actionLabel = statusLabel[l.newStatus] || l.newStatus || 'Updated';
        const title = `Workflow: ${actionLabel} by ${l.actionBy || 'User'}`;
        return {
          id: `app-log-${l.id || idx}-${currentAppId}`,
          applicationId: a.id,
          fapNumber: a.fapNumber,
          companyName: a.customer?.companyName || draft.customer?.companyName || 'Application',
          section: 'Documents',
          tabIndex: 6,
          actionType: (l.newStatus === 'APPROVED'
            ? 'APPROVE'
            : l.newStatus?.includes('SUBMIT')
              ? 'SUBMIT'
              : 'UPDATE') as any,
          title,
          details: l.comments
            ? `Comments: "${l.comments}" (Transition: ${statusLabel[l.previousStatus] || l.previousStatus} ➔ ${statusLabel[l.newStatus] || l.newStatus})`
            : `Application moved to ${statusLabel[l.newStatus] || l.newStatus}.`,
          actionBy: l.actionBy || 'System',
          userRole: l.userRole || 'Workflow',
          timestamp,
          read: true,
        };
      })
      .filter((wl: any) => !existingTitles.has(`${wl.title}_${wl.timestamp}`));

    return [...matched, ...workflowLogs].sort(
      (x, y) => new Date(y.timestamp).getTime() - new Date(x.timestamp).getTime(),
    );
  }, [
    localActivities,
    a.id,
    a.fapNumber,
    a.customer?.companyName,
    draft.customer?.companyName,
    liveCompanyName,
    a.approvalLogs,
  ]);

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
        setActiveStage('Pre-analysis');
      } else if ([0, 5, 1].includes(targetTabIndex)) {
        if (activeStage !== 'FAP Stage' && !isPreAnalysisReached) {
          setActiveStage('FAP Stage');
        }
      } else if ([2, 4].includes(targetTabIndex)) {
        setActiveStage('Pre-analysis');
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
