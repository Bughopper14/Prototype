import {useMemo} from 'react';
import {useNavigate, useSearchParams} from 'react-router';
import {applicationHref, CRM_PAGES} from '@/lib/routes';
import {buildNewApplicationDraft} from '@/lib/new-application';
import {ApplicationWorkspace} from '@/components/crm/application/ApplicationWorkspace';
import {useCrm} from '@/components/crm/CrmProvider';

export default function NewApplicationPage() {
  const customerId = useSearchParams()[0].get('customer') || undefined;
  const navigate = useNavigate();
  const {user, customers, addCustomer, reload, notify} = useCrm();
  const draft = useMemo(() => buildNewApplicationDraft(customers, customerId), [customers, customerId]);

  return (
    <ApplicationWorkspace
      value={draft}
      user={user}
      customers={customers}
      initialTab={0}
      onBack={() => navigate(CRM_PAGES[1].href)}
      onChange={saved => {
        reload();
        // Once the application has been created it lives at its own address.
        if (saved?.id && saved.id !== 'new') navigate(applicationHref(saved.id), {replace: true});
      }}
      onCustomerCreated={addCustomer}
      notify={notify}
    />
  );
}
