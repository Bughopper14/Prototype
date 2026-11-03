import {redirect} from 'next/navigation';
import {requireActor} from '@/lib/server/auth/guard';
import {one} from '@/lib/server/db/query';
import {PortalShell} from '@/components/portal/PortalShell';
import {UserManagement} from '@/components/portal/UserManagement';

export const metadata = {title: 'User Management · LiuGong Apps Portal'};
export const dynamic = 'force-dynamic';

export default async function UserManagementPage() {
  const actor = await requireActor('/user-management');
  const allowed = await one(
    `SELECT 1 AS ok FROM user_app_roles uar
     JOIN role_authorities ra ON ra.role_id = uar.role_id
     JOIN authorities au ON au.id = ra.authority_id
     WHERE uar.user_id = ? AND au.authority_name = 'manage_system' LIMIT 1`,
    [actor.portalUserId],
  );
  if (!allowed) redirect('/gallery');

  return (
    <PortalShell name={actor.name} wide>
      <div className="pt-welcome">
        <div className="pt-pill">
          <i className="fas fa-circle" style={{fontSize: 6}} /> User Management
        </div>
        <h2>Pengguna, Role &amp; Akses</h2>
        <p>Kelola user, role, authority, aplikasi, audit log, dan sesi aktif.</p>
      </div>
      <UserManagement currentUserId={actor.portalUserId} />
    </PortalShell>
  );
}
