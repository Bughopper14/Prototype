import type {ReactNode} from 'react';
import {CrmProvider} from './CrmProvider';
import {CrmShell} from './CrmShell';
import {CrmStyles} from './CrmStyles';

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
