/** Route map of the CRM workspace. Every page is a real Next.js route under /crm-dashboard. */

export const CRM_BASE = '/crm-dashboard';

export type CrmPageName =
  | 'Overview'
  | 'Applications'
  | 'Document desk'
  | 'Customers'
  | 'Customize master data'
  | 'Workflow'
  | 'Notifications'
  | 'Activity';

export const CRM_PAGES: {name: CrmPageName; href: string; authority: string}[] = [
  {name: 'Overview', href: CRM_BASE, authority: 'CRM_OVERVIEW_VIEW'},
  {name: 'Applications', href: `${CRM_BASE}/applications`, authority: 'CRM_APPLICATION_VIEW'},
  {name: 'Document desk', href: `${CRM_BASE}/document-desk`, authority: 'CRM_DOCUMENT-DESK_VIEW'},
  {name: 'Customers', href: `${CRM_BASE}/customers`, authority: 'CRM_CUSTOMER_VIEW'},
  {name: 'Customize master data', href: `${CRM_BASE}/master-data`, authority: 'CRM_MASTER-DATA_VIEW'},
  // Only administrators: no role holds this authority, so the page is for the Super Admin.
  {name: 'Workflow', href: `${CRM_BASE}/workflows`, authority: 'CRM_WORKFLOW_VIEW'},
  {name: 'Notifications', href: `${CRM_BASE}/notifications`, authority: 'CRM_NOTIFICATION_VIEW'},
  {name: 'Activity', href: `${CRM_BASE}/activity`, authority: 'CRM_ACTIVITY_VIEW'},
];

export const pageHref = (name: string) => CRM_PAGES.find(page => page.name === name)?.href ?? CRM_BASE;

export const applicationHref = (id: string, tab?: number) =>
  `${CRM_BASE}/applications/${id}${tab === undefined ? '' : `?tab=${tab}`}`;

export const newApplicationHref = (customerId?: string) =>
  `${CRM_BASE}/applications/new${customerId ? `?customer=${encodeURIComponent(customerId)}` : ''}`;
