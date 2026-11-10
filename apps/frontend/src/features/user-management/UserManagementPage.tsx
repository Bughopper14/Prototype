import {PortalShell} from '@/features/portal/components/PortalShell';
import {UserManagement} from '@/features/user-management/components/UserManagement';
import '@/features/user-management/user_management.css';
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
    <PortalShell
      name={user.name}
      wide
      brandText="User Management"
      brandSub="SYSTEM ADMINISTRATION"
      showAppsHubBtn={true}
    >
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-2 pt-2">
        <div>
          <h4 className="fw-bold text-secondary mb-0 d-flex align-items-center">
            <i className="fas fa-shield-alt text-warning me-2" style={{color: '#ff9900'}} />
            <span style={{color: '#475569', fontSize: '1.4rem', fontWeight: 800}}>System Administration</span>
          </h4>
          <small className="text-muted" style={{color: '#94a3b8'}}>
            Manage users, roles, authorities, and access control
          </small>
        </div>
        <div className="text-muted small d-none d-md-block" style={{color: '#64748b'}}>
          Logged in as: <strong className="text-secondary" style={{color: '#334155'}}>{user.name}</strong>
        </div>
      </div>
      <UserManagement currentUserId={user.portalUserId} />
    </PortalShell>
  );
}
