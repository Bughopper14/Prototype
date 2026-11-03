import {requireActor} from '@/lib/server/auth/guard';
import {many} from '@/lib/server/db/query';
import {logAudit} from '@/lib/server/auth/session';
import {PortalShell} from '@/components/portal/PortalShell';

export const metadata = {title: 'Apps Hub · LiuGong Apps Portal'};
export const dynamic = 'force-dynamic';

type PortalApp = {
  id: number;
  app_name: string;
  url_path: string;
  description: string | null;
  icon_class: string | null;
  role_name: string;
};

export default async function GalleryPage() {
  const actor = await requireActor('/gallery');
  const apps = await many<PortalApp>(
    `SELECT a.id, a.app_name, a.url_path, a.description, a.icon_class, r.role_name
     FROM applications a
     JOIN user_app_roles uar ON a.id = uar.app_id
     JOIN roles r ON uar.role_id = r.id
     WHERE uar.user_id = ? ORDER BY a.id`,
    [actor.portalUserId],
  );
  await logAudit(actor.portalUserId, 'Viewed Dashboard Gallery');

  return (
    <PortalShell name={actor.name}>
      <div className="pt-welcome">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="logo-bg" src="/img/logo.png" alt="" />
        <div className="pt-pill">
          <i className="fas fa-circle" style={{fontSize: 6}} /> Liugong Finance Indonesia
        </div>
        <h2>Selamat Datang, {actor.name}! 👋</h2>
        <p>Pilih aplikasi di bawah ini untuk mulai bekerja.</p>
      </div>

      <p className="pt-section-title">
        <i className="fas fa-th-large" style={{marginRight: 8}} />
        Aplikasi Tersedia
      </p>
      <div className="pt-grid">
        {apps.length === 0 ? (
          <div className="pt-empty">
            <i className="fas fa-folder-open fa-4x" />
            <h5>Tidak ada aplikasi tersedia</h5>
            <p style={{fontSize: '0.875rem'}}>
              Akun Anda belum diberikan akses ke aplikasi manapun.
              <br />
              Hubungi IT Admin untuk pengaturan akses.
            </p>
          </div>
        ) : (
          apps.map(app => (
            <a key={app.id} href={app.url_path} className="pt-app-card">
              <div className="pt-app-icon">
                <i className={app.icon_class || 'fas fa-layer-group'} />
              </div>
              <div className="pt-app-name">{app.app_name}</div>
              <div className="pt-app-desc">{app.description}</div>
              <span className="pt-role-badge">
                <i className="fas fa-user-tag" style={{marginRight: 4}} />
                {app.role_name}
              </span>
            </a>
          ))
        )}
      </div>
    </PortalShell>
  );
}
