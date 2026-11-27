import {hasAuthority} from '@/shared/lib/auth';
import {Download, Plus} from 'lucide-react';
import {useCrm} from './CrmProvider';

const TITLES: Record<string, string> = {Overview: 'Portfolio overview', Notifications: 'Notifikasi'};

const DESCRIPTIONS: Record<string, (firstName: string) => string> = {
  Overview: firstName => `Welcome back, ${firstName}. Here’s where your financing stands.`,
  Applications: () => 'Manage every application, from first contact to final approval.',
  'Document desk': () => 'Keep every document complete, verified, and ready for review.',
  Customers: () => 'Your customer relationships, connected to every application.',
  'Customize master data': () => 'Application master data configuration.',
  Workflow: () => 'Set up the stages an application goes through, and the fields and documents each stage requires.',
  Notifications: () => 'Deed review and approval results that need follow-up.',
  Activity: () => 'A transparent record of application decisions and updates.',
};

/** Title block shown at the top of each CRM page, with an optional "New application" and "Export" button. */
export function PageHeading({
  page,
  newApplicationButton = false,
  exportButton = false,
  onExport,
}: {
  page: string;
  newApplicationButton?: boolean;
  exportButton?: boolean;
  onExport?: () => void;
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
      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
        {exportButton && (
          <button className="button secondary" onClick={onExport} type="button" style={{height: '38px', padding: '0 14px', gap: '6px'}}>
            <Download size={15} />
            Export
          </button>
        )}
        {newApplicationButton && hasAuthority(user, 'CRM_APPLICATION_CREATE') && (
          <button className="button primary" onClick={() => startNewApplication()} type="button">
            <Plus size={17} />
            New application
          </button>
        )}
      </div>
    </div>
  );
}
