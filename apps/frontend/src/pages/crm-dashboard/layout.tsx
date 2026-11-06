import {Outlet} from 'react-router';
import {CrmClientRoot} from '@/components/crm/CrmClientRoot';
import {usePageTitle, useSession} from '@/lib/session';

export default function CrmLayout() {
  usePageTitle('LiuGong Finance · Origination Workspace');
  const user = useSession();
  return (
    <CrmClientRoot user={user}>
      <Outlet />
    </CrmClientRoot>
  );
}
