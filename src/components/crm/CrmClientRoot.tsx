'use client';

import {useEffect, useState, type ReactNode} from 'react';
import {CrmProvider} from '@/components/crm/CrmProvider';
import {CrmShell} from '@/components/crm/CrmShell';
import {CrmStyles} from '@/components/crm/CrmStyles';

/**
 * The workspace relies on browser-only APIs (TinyMCE, localStorage, canvas), so it renders after hydration.
 * This also keeps the server-rendered HTML small.
 */
export function CrmClientRoot({user, children}: {user: any; children: ReactNode}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <>
      <CrmStyles />
      <CrmProvider user={user}>
        <CrmShell>{children}</CrmShell>
      </CrmProvider>
    </>
  );
}
