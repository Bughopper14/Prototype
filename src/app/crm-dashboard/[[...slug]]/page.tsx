import CrmRoot from '@/components/crm/CrmRoot';
import {requireActor} from '@/lib/server/auth/guard';

export const metadata = {title: 'LiuGong Finance · Origination Workspace'};
export const dynamic = 'force-dynamic';

export default async function CrmDashboardPage() {
  await requireActor('/crm-dashboard');
  return <CrmRoot />;
}
