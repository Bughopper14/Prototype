import '@fortawesome/fontawesome-free/css/all.min.css';
import {useEffect, useRef, useState, type FormEvent, type ReactNode} from 'react';
import '../portal.css';

type Toast = {message: string; type: 'success' | 'error'} | null;

/** Navbar, slide-in menu, change-password dialog and footer shared by every portal page. */
export function PortalShell({
  name,
  children,
  wide = false,
  brandText,
  brandSub,
  showAppsHubBtn = false,
}: {
  name: string;
  children: ReactNode;
  wide?: boolean;
  brandText?: string;
  brandSub?: string;
  showAppsHubBtn?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const initial = (name || 'U').slice(0, 1).toUpperCase();

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function logout() {
    await fetch('/api/auth/logout', {method: 'POST'});
    window.location.assign('/login');
  }

  const openPassword = () => {
    setMenuOpen(false);
    setSidebarOpen(false);
    setPasswordOpen(true);
  };

  return (
    <div className="pt">
      <nav className="pt-navbar">
        <div className="pt-navbar-inner">
          <a className="pt-brand" href="/gallery">
            <div className="pt-brand-logo">
              <img src="/img/logo.png" alt="LiuGong Finance Indonesia" />
            </div>
            <div className="pt-brand-text-wrap">
              <span className="pt-brand-text">{brandText || 'LiuGong Apps Portal'}</span>
              <span className="pt-brand-sub">{brandSub || 'Finance Indonesia'}</span>
            </div>
          </a>

          <div className="pt-actions">
            {showAppsHubBtn && (
              <a href="/gallery" className="btn-apps-hub d-none d-md-inline-flex">
                <i className="fas fa-th-large me-1" /> Apps Hub
              </a>
            )}
            <div className="pt-dropdown pt-desktop-only" ref={menuRef}>
              <button
                className="pt-user-btn"
                type="button"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(o => !o)}
              >
                <div className="pt-avatar">{initial}</div>
                <span>{name}</span>
                <span className="caret" />
              </button>
              {menuOpen && (
                <div className="pt-menu">
                  <div className="pt-menu-header">User Actions</div>
                  <a className="pt-menu-item" href="/gallery">
                    <span className="pt-item-icon" style={{background: '#eff6ff', color: '#3b82f6'}}>
                      <i className="fas fa-th-large" />
                    </span>
                    Apps Hub
                  </a>
                  <button className="pt-menu-item" type="button" onClick={openPassword}>
                    <span className="pt-item-icon" style={{background: '#fffbeb', color: '#f59e0b'}}>
                      <i className="fas fa-key" />
                    </span>
                    Change Password
                  </button>
                  <hr className="pt-menu-divider" />
                  <button className="pt-menu-item danger" type="button" onClick={logout}>
                    <span className="pt-item-icon" style={{background: '#fef2f2', color: '#ef4444'}}>
                      <i className="fas fa-sign-out-alt" />
                    </span>
                    Logout
                  </button>
                </div>
              )}
            </div>
            <button
              className="pt-hamburger"
              type="button"
              aria-label="Menu"
              onClick={() => setSidebarOpen(true)}
            >
              <i className="fas fa-bars" />
            </button>
          </div>
        </div>
      </nav>

      {sidebarOpen && <div className="pt-backdrop" onClick={() => setSidebarOpen(false)} />}
      <aside className={`pt-sidebar${sidebarOpen ? ' open' : ''}`} aria-hidden={!sidebarOpen}>
        <div>
          <div className="pt-sidebar-head">
            <h5>
              <i className="fas fa-th-large" style={{color: '#ffc107', marginRight: 8}} />
              LiuGong Apps
            </h5>
            <button
              className="pt-sidebar-close"
              type="button"
              aria-label="Close"
              onClick={() => setSidebarOpen(false)}
            >
              <i className="fas fa-times" />
            </button>
          </div>
          <ul className="pt-nav">
            <li>
              <a className="active" href="/gallery">
                <i className="fas fa-th-large" style={{color: '#ffc107'}} />
                Apps Hub
              </a>
            </li>
          </ul>
        </div>
        <div className="pt-sidebar-foot">
          <div className="pt-sidebar-user">
            <div className="circle">{initial}</div>
            <div>
              <h6>{name}</h6>
              <small>Active User</small>
            </div>
          </div>
          <button className="pt-btn-outline" type="button" onClick={openPassword}>
            <i className="fas fa-key" style={{color: '#ffc107'}} />
            Change Password
          </button>
          <button className="pt-btn-danger" type="button" onClick={logout}>
            <i className="fas fa-sign-out-alt" />
            Logout
          </button>
        </div>
      </aside>

      {passwordOpen && (
        <ChangePasswordDialog
          onClose={() => setPasswordOpen(false)}
          onDone={message => {
            setPasswordOpen(false);
            setToast({message, type: 'success'});
          }}
        />
      )}

      <main>
        <div className={`pt-content${wide ? ' wide' : ''}`}>
          <div className={`pt-container${wide ? ' wide' : ''}`}>{children}</div>
        </div>
      </main>

      <footer className="pt-footer">
        <div className="pt-container">
          <img src="/img/logo.png" alt="LiuGong" />
          <p>&copy; {new Date().getFullYear()} Liugong Finance Indonesia &mdash; Internal Use Only</p>
        </div>
      </footer>

      {toast && (
        <div className={`pt-toast ${toast.type}`} role="alert">
          {toast.message}
        </div>
      )}
    </div>
  );
}

function ChangePasswordDialog({onClose, onDone}: {onClose: () => void; onDone: (message: string) => void}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = String(form.get('new_password') || '');
    if (next !== form.get('confirm_password')) return setError('Password baru dan konfirmasi tidak cocok.');
    if (next.length < 6) return setError('Password baru minimal 6 karakter.');
    setBusy(true);
    setError(null);
    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({current_password: form.get('current_password'), new_password: next}),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (data.success) onDone('✓ Password berhasil diubah!');
    else setError(data.error || 'Gagal mengubah password.');
  }

  return (
    <div className="pt-modal-backdrop" onClick={onClose}>
      <form className="pt-modal" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <div className="pt-modal-bar" />
        <div className="pt-modal-head">
          <div className="pt-modal-title">
            <div className="badge">
              <i className="fas fa-key" />
            </div>
            <div>
              <h5>Ganti Password</h5>
              <small>Perbarui password akun Anda</small>
            </div>
          </div>
          <button type="button" className="pt-modal-close" aria-label="Close" onClick={onClose}>
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="pt-modal-body">
          <label className="pt-form-label" htmlFor="cp_current">
            Password Saat Ini
          </label>
          <input id="cp_current" name="current_password" type="password" className="pt-input" required />
          <label className="pt-form-label" htmlFor="cp_new">
            Password Baru
          </label>
          <input id="cp_new" name="new_password" type="password" className="pt-input" required />
          <label className="pt-form-label" htmlFor="cp_confirm">
            Konfirmasi Password Baru
          </label>
          <input id="cp_confirm" name="confirm_password" type="password" className="pt-input" required />
          {error && <div className="pt-alert error">{error}</div>}
        </div>
        <div className="pt-modal-foot">
          <button type="button" className="pt-btn-light" onClick={onClose}>
            Batal
          </button>
          <button className="pt-btn-primary" disabled={busy}>
            {busy ? (
              <>
                <i className="fas fa-spinner fa-spin" style={{marginRight: 8}} />
                Menyimpan...
              </>
            ) : (
              <>
                <i className="fas fa-save" style={{marginRight: 8}} />
                Simpan Password
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
