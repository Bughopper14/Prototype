import {usePageTitle, useSession} from '@/shared/lib/session';
import {Outlet} from 'react-router';
import {CrmClientRoot} from './components/CrmClientRoot';

export default function CrmLayout() {
  usePageTitle('LiuGong Finance · Origination Workspace');
  const user = useSession();
  return (
    <CrmClientRoot user={user}>
      <Outlet />
    </CrmClientRoot>
  );
}
