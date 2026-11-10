import {lazy, Suspense} from 'react';
import {Navigate, Route, Routes} from 'react-router';
import {RequireSession} from '@/shared/lib/session';

// Each area is its own chunk, downloaded the first time the user opens it.
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const GalleryPage = lazy(() => import('@/features/portal/GalleryPage'));
const UserManagementPage = lazy(() => import('@/features/user-management/UserManagementPage'));
const CrmLayout = lazy(() => import('@/features/crm/CrmLayout'));
const OverviewPage = lazy(() => import('@/features/overview/OverviewPage'));
const ApplicationsPage = lazy(() => import('@/features/applications/ApplicationsPage'));
const NewApplicationPage = lazy(() => import('@/features/applications/NewApplicationPage'));
const ApplicationPage = lazy(() => import('@/features/applications/ApplicationPage'));
const DocumentDeskPage = lazy(() => import('@/features/documents/DocumentDeskPage'));
const CustomersPage = lazy(() => import('@/features/customers/CustomersPage'));
const MasterDataPage = lazy(() => import('@/features/master-data/MasterDataPage'));
const NotificationsPage = lazy(() => import('@/features/activity/NotificationsPage'));
const ActivityPage = lazy(() => import('@/features/activity/ActivityPage'));

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
