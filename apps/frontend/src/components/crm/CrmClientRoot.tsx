import type {ReactNode} from 'react';
import {CrmProvider} from '@/components/crm/CrmProvider';
import {CrmShell} from '@/components/crm/CrmShell';
import {CrmStyles} from '@/components/crm/CrmStyles';

/** Styles, shared data (CrmProvider) and the navigation shell around every /crm-dashboard page. */
export function CrmClientRoot({user, children}: {user: any; children: ReactNode}) {
  return (
    <>
      <CrmStyles />
      <CrmProvider user={user}>
        <CrmShell>{children}</CrmShell>
      </CrmProvider>
    </>
  );
}
