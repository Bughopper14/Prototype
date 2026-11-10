import {createContext, useContext, useEffect, useState, type ReactNode} from 'react';
import {useLocation} from 'react-router';
import {api, setCurrentUser} from './api';

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
    api('/auth/me')
      .then((me: SessionUser | null) => {
        if (!live) return;
        if (!me) {
          const next = location.pathname + location.search;
          window.location.replace(`/login?next=${encodeURIComponent(next)}`);
          return;
        }
        setCurrentUser(me);
        setUser(me);
      })
      .catch(() => live && window.location.replace('/login'));
    return () => {
      live = false;
    };
    // The session is checked once per page load; the API redirects on expiry afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return <div className="loading-strip" />;
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
