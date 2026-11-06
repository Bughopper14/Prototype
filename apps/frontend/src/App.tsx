import {lazy, Suspense} from 'react';
import {Navigate, Route, Routes} from 'react-router';
import {RequireSession} from '@/lib/session';

// Each area is its own chunk, downloaded the first time the user opens it.
const LoginPage = lazy(() => import('@/pages/login/page'));
const GalleryPage = lazy(() => import('@/pages/gallery/page'));
const UserManagementPage = lazy(() => import('@/pages/user-management/page'));
const CrmLayout = lazy(() => import('@/pages/crm-dashboard/layout'));
const OverviewPage = lazy(() => import('@/pages/crm-dashboard/page'));
const ApplicationsPage = lazy(() => import('@/pages/crm-dashboard/applications/page'));
const NewApplicationPage = lazy(() => import('@/pages/crm-dashboard/applications/new/page'));
const ApplicationPage = lazy(() => import('@/pages/crm-dashboard/applications/[id]/page'));
const DocumentDeskPage = lazy(() => import('@/pages/crm-dashboard/document-desk/page'));
const CustomersPage = lazy(() => import('@/pages/crm-dashboard/customers/page'));
const MasterDataPage = lazy(() => import('@/pages/crm-dashboard/master-data/page'));
const NotificationsPage = lazy(() => import('@/pages/crm-dashboard/notifications/page'));
const ActivityPage = lazy(() => import('@/pages/crm-dashboard/activity/page'));

export function App() {
  return (
    <Suspense fallback={<div className="loading-strip" />}>
      <Routes>
        <Route path="/" element={<Navigate to="/gallery" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/gallery"
          element={
            <RequireSession>
              <GalleryPage />
            </RequireSession>
          }
        />
        <Route
          path="/user-management"
          element={
            <RequireSession>
              <UserManagementPage />
            </RequireSession>
          }
        />
        <Route
          path="/crm-dashboard"
          element={
            <RequireSession>
              <CrmLayout />
            </RequireSession>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route path="applications" element={<ApplicationsPage />} />
          <Route path="applications/new" element={<NewApplicationPage />} />
          <Route path="applications/:id" element={<ApplicationPage />} />
          <Route path="document-desk" element={<DocumentDeskPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="master-data" element={<MasterDataPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="activity" element={<ActivityPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/gallery" replace />} />
      </Routes>
    </Suspense>
  );
}
