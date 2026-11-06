import {useEffect, useState} from 'react';
import {Navigate} from 'react-router';
import {PortalShell} from '@/components/portal/PortalShell';
import {UserManagement} from '@/components/portal/UserManagement';
import {api} from '@/lib/api';
import {usePageTitle, useSession} from '@/lib/session';

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
      <div className="pt-welcome">
        <div className="pt-pill">
          <i className="fas fa-circle" style={{fontSize: 6}} /> User Management
        </div>
        <h2>Pengguna, Role &amp; Akses</h2>
        <p>Kelola user, role, authority, aplikasi, audit log, dan sesi aktif.</p>
      </div>
      <UserManagement currentUserId={user.portalUserId} />
    </PortalShell>
  );
}
