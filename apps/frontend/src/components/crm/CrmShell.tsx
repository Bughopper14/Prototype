import {useState, type ReactNode} from 'react';
import {Link, useLocation} from 'react-router';
import {
  Activity,
  ArrowLeft,
  Bell,
  CheckCheck,
  Files,
  FolderCheck,
  Key,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Menu,
  Settings2,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import {api} from '@/lib/api';
import {checkIsAdmin, hasAuthority} from '@/lib/auth';
import {label} from '@liugong/shared';
import {CRM_PAGES, type CrmPageName} from '@/lib/routes';
import {ChangePasswordModal} from '@/components/crm/common/ChangePasswordModal';
import {useCrm} from '@/components/crm/CrmProvider';

const GALLERY_URL = '/gallery';

const PAGE_ICONS: Record<CrmPageName, {icon: LucideIcon; color: string}> = {
  Overview: {icon: LayoutDashboard, color: '#38bdf8'},
  Applications: {icon: Files, color: '#fbbf24'},
  'Document desk': {icon: FolderCheck, color: '#34d399'},
  Customers: {icon: Users, color: '#60a5fa'},
  'Customize master data': {icon: Settings2, color: '#c084fc'},
  Notifications: {icon: Bell, color: '#fb7185'},
  Activity: {icon: Activity, color: '#a3e635'},
};

/** Top bar, slide-in navigation drawer, footer, toast and change-password dialog around every CRM page. */
export function CrmShell({children}: {children: ReactNode}) {
  const {
    user,
    rows,
    customers,
    loading,
    error,
    reload,
    toast,
    notify,
    unreadNotifications,
    unreadActivities,
  } = useCrm();
  const {pathname} = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const roleDisplay =
    user.displayRole ||
    (checkIsAdmin(user) ? 'Administrator' : user.role === 'MKT' ? 'Marketing' : label(user.role || ''));

  const counts: Partial<Record<CrmPageName, number>> = {
    Applications: rows.length,
    Customers: customers.length,
    Notifications: unreadNotifications,
    Activity: unreadActivities,
  };

  const isActive = (href: string) =>
    href === '/crm-dashboard' ? pathname === href : pathname.startsWith(href);
  const closeDrawer = () => setDrawerOpen(false);

  async function logout() {
    await api('/auth/logout', 'POST').catch(() => {});
    window.location.href = '/login';
  }

  return (
    <div className="shell shell-column">
      <header className="crm-top-navbar">
        <div className="crm-nav-brand">
          <div className="crm-brand-badge">
            <img src="/img/logo.png" alt="LiuGong Logo" style={{height: 22, width: 'auto'}} />
          </div>
          <div className="crm-brand-text">
            <span className="crm-brand-title">CRM Dashboard</span>
            <span className="crm-brand-subtitle">LOGGED IN AS {roleDisplay.toUpperCase()}</span>
          </div>
        </div>

        <div className="crm-nav-actions">
          <a href={GALLERY_URL} className="btn-apps-hub" title="Back to Applications Gallery">
            <LayoutGrid size={15} color="#ff9900" />
            <span>Apps Hub</span>
          </a>
          <button
            type="button"
            className="btn-burger-menu"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu size={22} color="#ffffff" />
          </button>
        </div>
      </header>

      {drawerOpen && (
        <div className="crm-sidebar-backdrop" onClick={closeDrawer} aria-label="Close navigation overlay" />
      )}

      <aside className={`crm-sidebar-drawer ${drawerOpen ? 'drawer-open' : ''}`} aria-label="Main Navigation">
        <div className="drawer-header">
          <div className="drawer-brand-wrap">
            <ShieldCheck size={20} color="#ff9900" />
            <span className="drawer-title">CRM Dashboard</span>
          </div>
          <button type="button" className="drawer-close-btn" onClick={closeDrawer} aria-label="Close menu">
            <X size={20} color="#ffffff" />
          </button>
        </div>

        <div className="drawer-body">
          <a href={GALLERY_URL} className="sidebar-gallery-btn" style={{margin: '8px 12px 14px'}}>
            <ArrowLeft size={16} />
            <span>Back to Gallery</span>
          </a>

          <nav>
            {CRM_PAGES.filter(page => hasAuthority(user, page.authority)).map(page => {
              const {icon: Icon, color} = PAGE_ICONS[page.name];
              const active = isActive(page.href);
              const count = counts[page.name];
              return (
                <Link
                  key={page.name}
                  to={page.href}
                  className={`drawer-nav-item ${active ? 'active' : ''}`}
                  onClick={closeDrawer}
                >
                  <Icon size={20} style={{color: active ? '#002c5f' : color, flexShrink: 0}} />
                  <span>{page.name}</span>
                  {Boolean(count && count > 0) && <em>{count}</em>}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="drawer-footer">
          <div className="drawer-user-info">
            <div className="drawer-avatar">{(user.name || 'U').charAt(0).toUpperCase()}</div>
            <div className="drawer-user-meta">
              <div className="drawer-user-name" title={user.name}>
                {user.name}
              </div>
              <small className="drawer-user-role">
                {checkIsAdmin(user) ? 'System Administrator' : roleDisplay}
              </small>
            </div>
          </div>

          <div className="drawer-actions">
            <a href={GALLERY_URL} className="btn-apps-hub drawer-action-btn">
              <LayoutGrid size={15} color="#ff9900" />
              <span>Apps Hub</span>
            </a>
            <button
              type="button"
              className="btn-drawer-outline"
              onClick={() => {
                closeDrawer();
                setPasswordOpen(true);
              }}
            >
              <Key size={15} color="#ff9900" />
              <span>Change Password</span>
            </button>
            <button type="button" className="btn-drawer-danger" onClick={logout}>
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <main>
        <div className="content">
          {error && (
            <div className="error">
              {error}
              <button onClick={reload}>Retry</button>
            </div>
          )}
          {loading && <div className="loading-strip" />}
          {children}
          <footer>
            <span>© {new Date().getFullYear()} PT LiuGong Finance Indonesia</span>
            <span>
              Origination workspace <i /> All amounts in IDR
            </span>
          </footer>
        </div>
      </main>

      {passwordOpen && <ChangePasswordModal onClose={() => setPasswordOpen(false)} onSuccess={notify} />}

      {toast && (
        <div className="toast">
          <CheckCheck size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}
