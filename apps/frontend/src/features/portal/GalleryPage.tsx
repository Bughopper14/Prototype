import {api} from '@/shared/lib/api';
import {usePageTitle, useSession} from '@/shared/lib/session';
import {useEffect, useState} from 'react';
import {PortalShell} from './components/PortalShell';

type PortalApp = {
  id: number;
  app_name: string;
  url_path: string;
  description: string | null;
  icon_class: string | null;
  role_name: string;
};

export default function GalleryPage() {
  usePageTitle('Apps Hub · LiuGong Apps Portal');
  const user = useSession();
  const [apps, setApps] = useState<PortalApp[] | null>(null);

  useEffect(() => {
    api('/portal/apps')
      .then(setApps)
      .catch(() => setApps([]));
  }, []);

  return (
    <PortalShell name={user.name}>
      <div className="pt-welcome">
        <img className="logo-bg" src="/img/logo.png" alt="" />
        <div className="pt-pill">
          <i className="fas fa-circle" style={{fontSize: 6}} /> Liugong Finance Indonesia
        </div>
        <h2>Selamat Datang, {user.name}! 👋</h2>
        <p>Pilih aplikasi di bawah ini untuk mulai bekerja.</p>
      </div>

      <p className="pt-section-title">
        <i className="fas fa-th-large" style={{marginRight: 8}} />
        Aplikasi Tersedia
      </p>
      <div className="pt-grid">
        {apps === null ? null : apps.length === 0 ? (
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
