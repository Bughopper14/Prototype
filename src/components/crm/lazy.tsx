'use client';

import dynamic from 'next/dynamic';

/**
 * Heavy, rarely-opened screens are code-split: their JavaScript (and dependencies such as the 5,000-line FAP
 * template) is downloaded only when the user first opens them. next/dynamic needs literal options per call.
 */
const Loading = () => <div className="loading-screen">Loading…</div>;

export const PreAnalysisForm = dynamic(
  () => import('@/components/crm/pre-analysis/PreAnalysisForm').then(m => m.PreAnalysisForm),
  {ssr: false, loading: Loading},
);

export const NibOcrModal = dynamic(
  () => import('@/components/crm/ocr/NibOcrModal').then(m => m.NibOcrModal),
  {ssr: false, loading: Loading},
);

export const FapSheetPreview = dynamic(
  () => import('@/components/crm/fap-preview/FapSheetPreview').then(m => m.FapSheetPreview),
  {ssr: false, loading: Loading},
);

export const ActivityPage = dynamic(
  () => import('@/components/crm/activity/ActivityViews').then(m => m.ActivityPage),
  {ssr: false, loading: Loading},
);

export const EnhancedNotificationsPage = dynamic(
  () => import('@/components/crm/activity/ActivityViews').then(m => m.EnhancedNotificationsPage),
  {ssr: false, loading: Loading},
);
