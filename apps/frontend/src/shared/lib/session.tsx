import {createContext, useContext, useEffect, useState, type ReactNode} from 'react';
import {useLocation} from 'react-router';
import {api} from './api';

/** The signed-in user as returned by GET /api/v1/auth/me (the session id is never sent to the browser). */
export type SessionUser = {
  id: string;
  portalUserId: number;
  username: string;
  name: string;
  email: string;
  role: string;
  displayRole: string;
  isAdmin: boolean;
  authorities: string[];
  source: 'portal';
};

const SessionContext = createContext<SessionUser | null>(null);

/**
 * Gate for every signed-in page (replaces the Next.js middleware + server guard). The API still validates the
 * session cookie on every request; this only decides what to render and where to send signed-out users.
 */
export function RequireSession({children}: {children: ReactNode}) {
  const location = useLocation();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let live = true;
    let retryCount = 0;

    const checkSession = () => {
      api('/auth/me')
        .then((me: SessionUser | null) => {
          if (!live) return;
          if (!me) {
            const next = location.pathname + location.search;
            window.location.replace(`/login?reason=${encodeURIComponent('Sesi tidak ditemukan atau akun Anda belum memiliki akses ke aplikasi ini. Jika Anda baru saja login, hubungi IT Admin untuk meminta role.')}&next=${encodeURIComponent(next)}`);
            return;
          }
          setUser(me);
        })
        .catch((err) => {
          if (!live) return;
          console.warn('Network error checking session:', err);
          if (retryCount < 5) {
            retryCount++;
            setTimeout(checkSession, 1500);
          } else {
            const next = location.pathname + location.search;
            window.location.replace(`/login?reason=${encodeURIComponent('Koneksi ke backend terputus atau backend sedang restart. Silakan login kembali.')}&next=${encodeURIComponent(next)}`);
          }
        });
    };

    checkSession();
    return () => {
      live = false;
    };
    // The session is checked once per page load; the API redirects on expiry afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          color: '#64748b',
          fontFamily: 'Outfit, sans-serif',
        }}
      >
        <div className="loading-strip" style={{left: 0}} />
        <div
          style={{
            width: '36px',
            height: '36px',
            border: '3px solid #e2e8f0',
            borderTopColor: '#2563eb',
            borderRadius: '50%',
            animation: 'sessionSpin 0.8s linear infinite',
            marginBottom: '16px',
          }}
        />
        <p style={{fontSize: '14px', fontWeight: 500}}>Menghubungkan ke server...</p>
        <style>{`@keyframes sessionSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionUser {
  const user = useContext(SessionContext);
  if (!user) throw new Error('useSession must be used inside <RequireSession>');
  return user;
}

/** Sets the browser tab title while a page is mounted. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
