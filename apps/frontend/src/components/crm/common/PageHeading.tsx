import {Plus} from 'lucide-react';
import {hasAuthority} from '@/lib/auth';
import {useCrm} from '@/components/crm/CrmProvider';

const TITLES: Record<string, string> = {Overview: 'Portfolio overview', Notifications: 'Notifikasi'};

const DESCRIPTIONS: Record<string, (firstName: string) => string> = {
  Overview: firstName => `Welcome back, ${firstName}. Here’s where your financing stands.`,
  Applications: () => 'Manage every application, from first contact to final approval.',
  'Document desk': () => 'Keep every document complete, verified, and ready for review.',
  Customers: () => 'Your customer relationships, connected to every application.',
  'Customize master data': () => 'Application master data configuration.',
  Notifications: () => 'Deed review and approval results that need follow-up.',
  Activity: () => 'A transparent record of application decisions and updates.',
};

/** Title block shown at the top of each CRM page, with an optional "New application" button. */
export function PageHeading({
  page,
  newApplicationButton = false,
}: {
  page: string;
  newApplicationButton?: boolean;
}) {
  const {user, startNewApplication} = useCrm();
  const firstName = String(user.name || '').split(' ')[0];

  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">
          {page === 'Overview' ? 'A CLEAR VIEW. A CONFIDENT NEXT STEP.' : 'LOAN ORIGINATION & MANAGEMENT'}
        </div>
        <h1>{TITLES[page] || page}</h1>
        <p>{DESCRIPTIONS[page]?.(firstName)}</p>
      </div>
      {newApplicationButton && hasAuthority(user, 'crm_create_application') && (
        <button className="button primary" onClick={() => startNewApplication()}>
          <Plus size={17} />
          New application
        </button>
      )}
    </div>
  );
}
