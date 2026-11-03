'use client';

import {useEffect, useState} from 'react';
import {useParams, useRouter, useSearchParams} from 'next/navigation';
import {api} from '@/lib/client/api';
import {CRM_PAGES} from '@/lib/client/routes';
import {blank, projectFields} from '@/lib/shared/fields';
import {ApplicationWorkspace} from '@/components/crm/application/ApplicationWorkspace';
import {useCrm} from '@/components/crm/CrmProvider';

const PRE_ANALYSIS_STATUSES = [
  'SUBMITTED_TO_BS',
  'BS_VERIFIED',
  'IN_CA_LEGAL_REVIEW',
  'CREDIT_COMMITTEE_REVIEW',
  'APPROVED',
];
const PRE_ANALYSIS_TAB = 8;

export default function ApplicationPage() {
  const {id} = useParams<{id: string}>();
  const tabParam = useSearchParams().get('tab');
  const router = useRouter();
  const {user, customers, addCustomer, reload, notify} = useCrm();
  const [application, setApplication] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    setApplication(null);
    api(`/applications/${id}`)
      .then(record => {
        if (!live) return;
        if (!record.projects?.length) record.projects = [blank(projectFields)];
        setApplication(record);
      })
      .catch(e => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [id]);

  if (error) return <div className="error">{error}</div>;
  if (!application) return <div className="loading-strip" />;

  const inPreAnalysis =
    application.stage === 'Pre-analysis' || PRE_ANALYSIS_STATUSES.includes(application.status);
  const initialTab = tabParam !== null ? Number(tabParam) : inPreAnalysis ? PRE_ANALYSIS_TAB : 0;

  return (
    <ApplicationWorkspace
      value={application}
      user={user}
      customers={customers}
      initialTab={initialTab}
      onBack={() => {
        router.push(CRM_PAGES[1].href);
        reload();
      }}
      onChange={updated => {
        setApplication(updated);
        reload();
      }}
      onCustomerCreated={addCustomer}
      notify={notify}
    />
  );
}
