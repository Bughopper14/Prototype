import {AccessGate} from '@/features/crm/components/AccessGate';
import {useCrm} from '@/features/crm/components/CrmProvider';
import {CRM_PAGES} from '@/shared/lib/routes';
import {useEffect} from 'react';
import {useNavigate, useSearchParams} from 'react-router';

/**
 * Direct visits to /crm-dashboard/applications/new redirect to the Applications list
 * and open the centered New Application modal (carrying over ?customer= when given).
 */
export default function NewApplicationPage() {
  const customerId = useSearchParams()[0].get('customer') || undefined;
  const navigate = useNavigate();
  const {startNewApplication} = useCrm();

  useEffect(() => {
    startNewApplication(customerId);
    navigate(CRM_PAGES[1].href, {replace: true});
  }, [customerId, navigate, startNewApplication]);

  return <AccessGate authority="CRM_APPLICATION_CREATE" page="New application">{null}</AccessGate>;
}
