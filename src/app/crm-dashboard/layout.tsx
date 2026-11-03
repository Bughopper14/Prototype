import type {ReactNode} from 'react';
import {requireActor} from '@/lib/server/auth/guard';
import {CrmClientRoot} from '@/components/crm/CrmClientRoot';

export const metadata = {title: 'LiuGong Finance · Origination Workspace'};
export const dynamic = 'force-dynamic';

export default async function CrmLayout({children}: {children: ReactNode}) {
  const {sessionId: _sessionId, ...user} = await requireActor('/crm-dashboard');
  return <CrmClientRoot user={user}>{children}</CrmClientRoot>;
}
