import {AccessGate} from '@/features/crm/components/AccessGate';
import {useCrm} from '@/features/crm/components/CrmProvider';
import {applicationHref, CRM_PAGES} from '@/shared/lib/routes';
import {useNavigate, useSearchParams} from 'react-router';
import {NewApplicationStart} from './NewApplicationStart';

/** A new application is saved first, with only who the debtor is; its FAP form and Pre-analysis are filled afterwards. */
export default function NewApplicationPage() {
  const customerId = useSearchParams()[0].get('customer') || undefined;
  const navigate = useNavigate();
  const {customers, reload, notify} = useCrm();

  return (
    <AccessGate authority="CRM_APPLICATION_CREATE" page="New application">
      <NewApplicationStart
        customers={customers}
        preselectedCustomerId={customerId}
        onBack={() => navigate(CRM_PAGES[1].href)}
        onCreated={id => {
          reload();
          navigate(applicationHref(id, 0), {replace: true});
        }}
        notify={notify}
      />
    </AccessGate>
  );
}
