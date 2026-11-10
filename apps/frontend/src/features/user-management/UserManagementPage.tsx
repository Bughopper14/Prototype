import {PortalShell} from '@/features/portal/components/PortalShell';
import {UserManagement} from '@/features/user-management/components/UserManagement';
import {api} from '@/shared/lib/api';
import {usePageTitle, useSession} from '@/shared/lib/session';
import {useEffect, useState} from 'react';
import {Navigate} from 'react-router';

export default function UserManagementPage() {
  usePageTitle('User Management · LiuGong Apps Portal');
  const user = useSession();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    api('/portal/access')
      .then(access => setAllowed(Boolean(access?.manageSystem)))
      .catch(() => setAllowed(false));
  }, []);

  if (allowed === null) return <div className="loading-strip" />;
  if (!allowed) return <Navigate to="/gallery" replace />;

  return (
    <PortalShell name={user.name} wide>
      <UserManagement currentUserId={user.portalUserId} fullName={user.name} />
    </PortalShell>
  );
}
