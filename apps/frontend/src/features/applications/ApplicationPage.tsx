import {useCrm} from '@/features/crm/components/CrmProvider';
import {api} from '@/shared/lib/api';
import {CRM_PAGES} from '@/shared/lib/routes';
import {blank, projectFields} from '@liugong/shared';
import {useEffect, useState} from 'react';
import {useNavigate, useParams, useSearchParams} from 'react-router';
import {ApplicationWorkspace} from './components/ApplicationWorkspace';

const PRE_ANALYSIS_STATUSES = [
  'SUBMITTED_TO_BS',
  'BS_VERIFIED',
  'IN_CA_LEGAL_REVIEW',
  'CREDIT_COMMITTEE_REVIEW',
  'APPROVED',
];
const PRE_ANALYSIS_TAB = 8;

export default function ApplicationPage() {
  const {id = ''} = useParams<{id: string}>();
  const tabParam = useSearchParams()[0].get('tab');
  const navigate = useNavigate();
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
        navigate(CRM_PAGES[1].href);
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
