import {lazy, Suspense, type ComponentProps, type ComponentType} from 'react';

/**
 * Heavy, rarely-opened screens are code-split: their JavaScript (and dependencies such as the 5,000-line FAP
 * template) is downloaded only when the user first opens them.
 */
const Loading = () => <div className="loading-screen">Loading…</div>;

function lazyComponent<T extends ComponentType<any>>(load: () => Promise<T>) {
  const Lazy = lazy(async () => ({default: await load()}));
  return (props: ComponentProps<T>) => (
    <Suspense fallback={<Loading />}>
      <Lazy {...(props as any)} />
    </Suspense>
  );
}

export const PreAnalysisForm = lazyComponent(() =>
  import('@/components/crm/pre-analysis/PreAnalysisForm').then(m => m.PreAnalysisForm),
);

export const NibOcrModal = lazyComponent(() =>
  import('@/components/crm/ocr/NibOcrModal').then(m => m.NibOcrModal),
);

export const FapSheetPreview = lazyComponent(() =>
  import('@/components/crm/fap-preview/FapSheetPreview').then(m => m.FapSheetPreview),
);

export const ActivityPage = lazyComponent(() =>
  import('@/components/crm/activity/ActivityViews').then(m => m.ActivityPage),
);

export const EnhancedNotificationsPage = lazyComponent(() =>
  import('@/components/crm/activity/ActivityViews').then(m => m.EnhancedNotificationsPage),
);
