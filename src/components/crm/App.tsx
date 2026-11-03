import {ActivityPage, EnhancedNotificationsPage} from '@/components/crm/lazy';
import {getStoredActivities, getReadActivityIds, saveReadActivityIds, getStoredNotifications, getReadNotificationIds, saveReadNotificationIds, ensureInitialActivitySeeds, type SystemActivity, type SystemNotificationItem} from '@/lib/crm/system-activity';
import {useEffect, useState, useMemo} from 'react';
import {ShieldAlert, LayoutGrid, ArrowLeft, Plus, Bell, LayoutDashboard, Files, FolderCheck, Users, Activity, Settings2, CheckCheck, ShieldCheck, LogOut, X, Menu, Loader2, Key} from 'lucide-react';
import {api} from '@/lib/crm/api';
import {MasterDataPage, setMasterData} from '@/components/crm/master-data/master-data';
import {profileFields, customerFields, picFields, projectFields, proposalFields, blank, label} from '@/lib/shared/fields';
import {getGalleryUrl, redirectToGlobalLogin, checkIsAdmin, hasAuthority} from '@/lib/crm/auth';
import {Modal} from '@/components/crm/common/ui';
import {ChangePasswordModal} from '@/components/crm/common/ChangePasswordModal';
import {Overview, ApplicationTable} from '@/components/crm/overview/Overview';
import {CustomerDirectory} from '@/components/crm/overview/CustomerDirectory';
import {Detail} from '@/components/crm/application/Detail';
import {DocumentDesk} from '@/components/crm/overview/DocumentDesk';

export default function App(){
  const [notifications,setNotifications]=useState<any[]>([]);
  const [activities,setActivities]=useState<SystemActivity[]>(()=>getStoredActivities());
  const [readActivityIds,setReadActivityIds]=useState<Set<string>>(()=>getReadActivityIds());
  const [readNotificationIds,setReadNotificationIds]=useState<Set<string>>(()=>getReadNotificationIds());

  useEffect(() => {
    const updateState = () => {
      setActivities(getStoredActivities());
      setReadActivityIds(getReadActivityIds());
      setReadNotificationIds(getReadNotificationIds());
    };
    window.addEventListener('crm-activity-state-change', updateState);
    window.addEventListener('crm-notification-state-change', updateState);
    return () => {
      window.removeEventListener('crm-activity-state-change', updateState);
      window.removeEventListener('crm-notification-state-change', updateState);
    };
  }, []);

  const allNotifications = useMemo<SystemNotificationItem[]>(() => {
    const local = getStoredNotifications();
    const serverFormatted: SystemNotificationItem[] = (notifications || []).map((n: any) => ({
      id: n.id,
      applicationId: n.applicationId,
      fapNumber: n.fapNumber,
      companyName: n.companyName || 'Application',
      section: 'Legal',
      tabIndex: 5,
      title: n.title,
      message: n.message,
      priority: 'normal',
      taskType: 'Deed Review',
      createdAt: n.createdAt,
      readAt: n.readAt
    }));
    const map = new Map<string, SystemNotificationItem>();
    for (const item of local) map.set(item.id, item);
    for (const item of serverFormatted) map.set(item.id, item);
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [notifications]);

  const unreadNotificationsCount = allNotifications.filter(
    n => !n.readAt && !readNotificationIds.has(n.id)
  ).length;
  const unreadActivitiesCount = activities.filter(
    a => !a.read && !readActivityIds.has(a.id)
  ).length;

  const handleMarkActivityRead = (id: string) => {
    setReadActivityIds(prev => {
      const next = new Set(prev);
      next.add(id);
      saveReadActivityIds(next);
      return next;
    });
  };

  const handleMarkAllActivitiesRead = () => {
    const allIds = new Set(activities.map(a => a.id));
    setReadActivityIds(allIds);
    saveReadActivityIds(allIds);
  };

  const handleMarkNotificationRead = async (id: string) => {
    setReadNotificationIds(prev => {
      const next = new Set(prev);
      next.add(id);
      saveReadNotificationIds(next);
      return next;
    });
    try {
      await api('/notifications/' + id + '/read', 'PATCH', {});
    } catch {}
  };

  const handleMarkAllNotificationsRead = async () => {
    const allIds = new Set(allNotifications.map(n => n.id));
    setReadNotificationIds(allIds);
    saveReadNotificationIds(allIds);
    for (const n of notifications) {
      if (!n.readAt) {
        try {
          await api('/notifications/' + n.id + '/read', 'PATCH', {});
        } catch {}
      }
    }
  };
  const [user,setUser]=useState<any>(null),[ready,setReady]=useState(false),[page,setPage]=useState('Overview'),[rows,setRows]=useState<any[]>([]),[customers,setCustomers]=useState<any[]>([]),[selected,setSelected]=useState<any>(null),[detailTab,setDetailTab]=useState(0),[newOpen,setNewOpen]=useState(false),[toast,setToast]=useState(''),[globalError,setGlobalError]=useState(''),[sidebarOpen,setSidebarOpen]=useState(false),[changePasswordOpen,setChangePasswordOpen]=useState(false),[loading,setLoading]=useState(false);
  const notify=(s:string)=>{setToast(s);setTimeout(()=>setToast(''),4500);};

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  async function load(){setLoading(true);try{const [r,c,m,n]=await Promise.all([api('/applications'),api('/customers'),api('/master-data'),api('/notifications')]);setNotifications(n);setMasterData(m);setRows(r);setCustomers(c);ensureInitialActivitySeeds(r, user);setActivities(getStoredActivities());setGlobalError('');}catch(e:any){setGlobalError(e.message);}finally{setLoading(false);}}
  useEffect(()=>{
    api('/auth/me')
      .then(u=>{
        if(!u || (!u.username && !u.name && !u.id && !u.email)){
          redirectToGlobalLogin('Your session has expired. Please log in again.');
        } else {
          setUser(u);
        }
      })
      .catch(()=>{
        redirectToGlobalLogin('Your session has expired. Please log in again.');
      })
      .finally(()=>setReady(true));
  },[]);
  useEffect(()=>{if(user)load();},[user]);
  useEffect(()=>{if(!user)return;let live=true;const refresh=()=>api('/notifications').then(n=>{if(live)setNotifications(n);}).catch(()=>{});const timer=setInterval(refresh,15000);window.addEventListener('storage',refresh);return()=>{live=false;clearInterval(timer);window.removeEventListener('storage',refresh);};},[user]);
  async function readNotification(id:string){try{await api('/notifications/'+id+'/read','PATCH',{});setNotifications(await api('/notifications'));}catch(e:any){setGlobalError(e.message);}}
  async function open(id:string,tab?:number){
   setLoading(true);
   try{
     const app = await api('/applications/'+id);
     if (!app.projects || app.projects.length === 0) {
       app.projects = [blank(projectFields)];
     }
     const isPre = (app.stage === 'Pre-analysis') || ['SUBMITTED_TO_BS','BS_VERIFIED','IN_CA_LEGAL_REVIEW','CREDIT_COMMITTEE_REVIEW','APPROVED'].includes(app.status);
     const resolvedTab = tab !== undefined ? tab : (isPre ? 8 : 0);
     setDetailTab(resolvedTab);
     setSelected(app);
   }catch(e:any){
     setGlobalError(e.message);
   }finally{
     setLoading(false);
   }
 }
  const crmNavDefinitions = [
    { name: 'Overview', icon: LayoutDashboard, color: '#38bdf8', authority: 'crm_view_overview', count: null },
    { name: 'Applications', icon: Files, color: '#fbbf24', authority: 'crm_view_applications', count: rows.length },
    { name: 'Document desk', icon: FolderCheck, color: '#34d399', authority: 'crm_view_document_desk', count: null },
    { name: 'Customers', icon: Users, color: '#60a5fa', authority: 'crm_view_customers', count: customers.length },
    { name: 'Customize master data', icon: Settings2, color: '#c084fc', authority: 'crm_view_master_data', count: null },
    { name: 'Notifications', icon: Bell, color: '#fb7185', authority: 'crm_view_notifications', count: unreadNotificationsCount },
    { name: 'Activity', icon: Activity, color: '#a3e635', authority: 'crm_view_activity', count: unreadActivitiesCount }
  ];

  const allowedNavItems = crmNavDefinitions.filter(item => hasAuthority(user, item.authority));

  useEffect(() => {
    if (!user) return;
    const currentNav = crmNavDefinitions.find(item => item.name === page);
    if (currentNav && !hasAuthority(user, currentNav.authority)) {
      const firstAllowed = crmNavDefinitions.find(item => hasAuthority(user, item.authority));
      if (firstAllowed) {
        setPage(firstAllowed.name);
      }
    }
  }, [user, page]);

  if(!ready)return <div className="loading-screen"><Loader2 className="spin"/>Opening your workspace…</div>;
  if(!user) {
    redirectToGlobalLogin();
    return (
      <div className="loading-screen">
        <Loader2 className="spin" size={24} />
        Redirecting to Portal Login...
      </div>
    );
  }
  const navigate=(p:string)=>{setPage(p);setSelected(null);setSidebarOpen(false);};

  const handleLogout = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    try {
      await api('/auth/logout', 'POST');
    } catch {}
    window.location.href = '/login';
  };

  const roleDisplay = user?.displayRole || (checkIsAdmin(user) ? 'Administrator' : user?.role === 'MKT' ? 'Marketing' : label(user?.role || ''));


  function startNewApplication(preselectedCustomerId?: string) {
    const isAdminUser = checkIsAdmin(user);
    if (!isAdminUser && user?.role !== 'MKT') {
      notify('Application creation is available for Marketing (MKT) and Administrator accounts.');
      return;
    }
    const defaultCategory = preselectedCustomerId ? 'EXISTING' : 'NEW';
    const targetCust = preselectedCustomerId ? customers.find((c: any) => c.id === preselectedCustomerId) : null;
    const newAppDraft = {
      ...blank(profileFields),
      id: 'new',
      isNew: true,
      fapNumber: 'Auto (Generated on save)',
      applicationDate: new Date().toISOString().slice(0, 10),
      status: 'DRAFT',
      stage: 'FAP Stage',
      customerStatus: defaultCategory,
      customerCategory: defaultCategory,
      customerId: targetCust?.id || '',
      customer: targetCust ? structuredClone(targetCust) : blank(customerFields),
      branchCode: '',
      locationStatus: '',
      industrySegment: '',
      businessRole: '',
      mainBusiness: '',
      repaymentSource: '',
      companyAddress: '',
      province: '',
      city: '',
      district: '',
      village: '',
      rt: '',
      rw: '',
      postalCode: '',
      phoneFax: '',
      email: '',
      website: '',
      pic: blank(picFields),
      stakeholders: [],
      projects: [blank(projectFields)],
      bankReferences: [],
      proposal: { ...blank(proposalFields), units: [] },
      financialStatements: [],
      documentChecks: [],
      legal: { deeds: [] },
      signoffs: [],
      approvalLogs: [],
    };
    setDetailTab(0);
    setSelected(newAppDraft);
  }

  return (
    <div className="shell shell-column">
      {/* 1. Global Top Navbar (Gambar 3) */}
      <header className="crm-top-navbar">
        <div className="crm-nav-brand">
          <div className="crm-brand-badge">
            <img
              src="/img/logo.png"
              alt="LiuGong Logo"
              style={{ height: '22px', width: 'auto' }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  'https://www.static-src.com/wcsstore/Indraprastha/images/brandlogo//BRD-28844/liugong-logo.png';
              }}
            />
          </div>
          <div className="crm-brand-text">
            <span className="crm-brand-title">CRM Dashboard</span>
            <span className="crm-brand-subtitle">LOGGED IN AS {roleDisplay.toUpperCase()}</span>
          </div>
        </div>

        <div className="crm-nav-actions">
          <a href={getGalleryUrl()} className="btn-apps-hub" title="Back to Applications Gallery">
            <LayoutGrid size={15} color="#ff9900" />
            <span>Apps Hub</span>
          </a>
          <button
            type="button"
            className="btn-burger-menu"
            onClick={() => setSidebarOpen(true)}
            title="Open Navigation Menu"
            aria-label="Open navigation menu"
          >
            <Menu size={22} color="#ffffff" />
          </button>
        </div>
      </header>

      {/* 2. Offcanvas Navigation Drawer Backdrop & Drawer (Gambar 2 & 4) */}
      {sidebarOpen && (
        <div
          className="crm-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation overlay"
        />
      )}

      <aside className={'crm-sidebar-drawer ' + (sidebarOpen ? 'drawer-open' : '')} aria-label="Main Navigation">
        <div className="drawer-header">
          <div className="drawer-brand-wrap">
            <ShieldCheck size={20} color="#ff9900" />
            <span className="drawer-title">CRM Dashboard</span>
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
            title="Close navigation"
          >
            <X size={20} color="#ffffff" />
          </button>
        </div>

        <div className="drawer-body">
          <a
            href={getGalleryUrl()}
            className="sidebar-gallery-btn"
            title="Back to Applications Gallery"
            style={{ margin: '8px 12px 14px 12px' }}
          >
            <ArrowLeft size={16} />
            <span>Back to Gallery</span>
          </a>



          <nav>
            {allowedNavItems.map(({ name, icon: Icon, color, count }) => (
              <button
                key={name}
                type="button"
                className={'drawer-nav-item ' + (page === name ? 'active' : '')}
                onClick={() => {
                  navigate(name);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={20} style={{ color: page === name ? '#002c5f' : color, flexShrink: 0 }} />
                <span>{name}</span>
                {Boolean(count && count > 0) && (
                  <em>{count}</em>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="drawer-footer">
          <div className="drawer-user-info">
            <div className="drawer-avatar">
              {(user.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="drawer-user-meta">
              <div className="drawer-user-name" title={user.name}>{user.name}</div>
              <small className="drawer-user-role">{checkIsAdmin(user) ? 'System Administrator' : roleDisplay}</small>
            </div>
          </div>

          <div className="drawer-actions">
            <a href={getGalleryUrl()} className="btn-apps-hub drawer-action-btn" title="Back to Apps Hub">
              <LayoutGrid size={15} color="#ff9900" />
              <span>Apps Hub</span>
            </a>
            <button
              type="button"
              className="btn-drawer-outline"
              onClick={() => {
                setSidebarOpen(false);
                setChangePasswordOpen(true);
              }}
            >
              <Key size={15} color="#ff9900" />
              <span>Change Password</span>
            </button>
            <a href="/logout" className="btn-drawer-danger" onClick={handleLogout}>
              <LogOut size={15} />
              <span>Logout</span>
            </a>
          </div>
        </div>
      </aside>

      {/* 3. Main Workspace (Full width, margin-left: 0) */}
      <main>


        <div className="content">
          {globalError && (
            <div className="error">
              {globalError}
              <button onClick={load}>Retry</button>
            </div>
          )}
          {loading && <div className="loading-strip" />}
          {selected ? (
            <Detail
              value={selected}
              user={user}
              customers={customers}
              initialTab={detailTab}
              onBack={() => {
                setSelected(null);
                load();
              }}
              onChange={v => {
                setSelected(v);
                load();
              }}
              onCustomerCreated={c => setCustomers(prev => [c, ...prev])}
              notify={notify}
            />
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    {page === 'Overview' ? 'A CLEAR VIEW. A CONFIDENT NEXT STEP.' : 'LOAN ORIGINATION & MANAGEMENT'}
                  </div>
                  <h1>{page === 'Overview' ? 'Portfolio overview' : page === 'Notifications' ? 'Notifikasi' : page}</h1>
                  <p>
                    {
                      (
                        {
                          Overview: `Welcome back, ${user.name.split(' ')[0]}. Here’s where your financing stands.`,
                          Applications: 'Manage every application, from first contact to final approval.',
                          'Document desk': 'Keep every document complete, verified, and ready for review.',
                          Customers: 'Your customer relationships, connected to every application.',
                          'Customize master data': 'Application master data configuration.',
                          Notifications: 'Deed review and approval results that need follow-up.',
                          Activity: 'A transparent record of application decisions and updates.'
                        } as any
                      )[page]
                    }
                  </p>
                </div>
                {(page === 'Overview' || page === 'Applications') && hasAuthority(user, 'crm_create_application') && (
                  <button
                    className="button primary"
                    onClick={() => startNewApplication()}
                  >
                    <Plus size={17} />New application
                  </button>
                )}
              </div>
              {crmNavDefinitions.find(i => i.name === page) && !hasAuthority(user, crmNavDefinitions.find(i => i.name === page)!.authority) ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', margin: '20px 0' }}>
                  <ShieldAlert size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>Akses Dibatasi</h2>
                  <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '480px', margin: '0 auto 20px' }}>
                    Akun Anda ({roleDisplay}) tidak memiliki izin ({crmNavDefinitions.find(i => i.name === page)?.authority}) untuk melihat halaman {page}.
                  </p>
                  <button className="button primary" onClick={() => {
                    const firstAllowed = crmNavDefinitions.find(i => hasAuthority(user, i.authority));
                    if (firstAllowed) setPage(firstAllowed.name);
                  }}>
                    Kembali ke Dashboard
                  </button>
                </div>
              ) : (
                <>
                  {page === 'Overview' && hasAuthority(user, 'crm_view_overview') && <Overview rows={rows} user={user} open={open} navigate={navigate} />}
                  {page === 'Applications' && hasAuthority(user, 'crm_view_applications') && <ApplicationTable rows={rows} open={open} />}
                  {page === 'Document desk' && hasAuthority(user, 'crm_view_document_desk') && <DocumentDesk rows={rows} open={open} user={user} />}
                  {page === 'Customers' && hasAuthority(user, 'crm_view_customers') && (
                    <CustomerDirectory
                      customers={customers}
                      rows={rows}
                      user={user}
                      open={open}
                      startNewApplication={hasAuthority(user, 'crm_create_application') ? startNewApplication : undefined}
                      notify={notify}
                    />
                  )}
                  {page === 'Customize master data' && hasAuthority(user, 'crm_view_master_data') && <MasterDataPage />}
                  {page === 'Notifications' && hasAuthority(user, 'crm_view_notifications') && (
                    <EnhancedNotificationsPage
                      notifications={allNotifications}
                      readNotificationIds={readNotificationIds}
                      onOpen={open}
                      onMarkRead={handleMarkNotificationRead}
                      onMarkAllRead={handleMarkAllNotificationsRead}
                    />
                  )}
                  {page === 'Activity' && hasAuthority(user, 'crm_view_activity') && (
                    <ActivityPage
                      activities={activities}
                      readActivityIds={readActivityIds}
                      onOpen={open}
                      onMarkRead={handleMarkActivityRead}
                      onMarkAllRead={handleMarkAllActivitiesRead}
                    />
                  )}
                </>
              )}
            </>
          )}
          <footer>
            <span>© {new Date().getFullYear()} PT LiuGong Finance Indonesia</span>
            <span>
              Origination workspace <i /> All amounts in IDR
            </span>
          </footer>
        </div>
      </main>

      {/* Change Password Modal */}
      {changePasswordOpen && (
        <ChangePasswordModal
          onClose={() => setChangePasswordOpen(false)}
          onSuccess={msg => notify(msg)}
        />
      )}

      {toast && (
        <div className="toast">
          <CheckCheck size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}
