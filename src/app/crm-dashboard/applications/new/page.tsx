'use client';

import {useMemo} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {applicationHref, CRM_PAGES} from '@/lib/client/routes';
import {buildNewApplicationDraft} from '@/lib/client/new-application';
import {ApplicationWorkspace} from '@/components/crm/application/ApplicationWorkspace';
import {useCrm} from '@/components/crm/CrmProvider';

export default function NewApplicationPage() {
  const customerId = useSearchParams().get('customer') || undefined;
  const router = useRouter();
  const {user, customers, addCustomer, reload, notify} = useCrm();
  const draft = useMemo(() => buildNewApplicationDraft(customers, customerId), [customers, customerId]);

  return (
    <ApplicationWorkspace
      value={draft}
      user={user}
      customers={customers}
      initialTab={0}
      onBack={() => router.push(CRM_PAGES[1].href)}
      onChange={saved => {
        reload();
        // Once the application has been created it lives at its own address.
        if (saved?.id && saved.id !== 'new') router.replace(applicationHref(saved.id));
      }}
      onCustomerCreated={addCustomer}
      notify={notify}
    />
  );
}
