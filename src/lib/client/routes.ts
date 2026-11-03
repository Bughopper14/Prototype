/** Route map of the CRM workspace. Every page is a real Next.js route under /crm-dashboard. */

export const CRM_BASE = '/crm-dashboard';

export type CrmPageName =
  | 'Overview'
  | 'Applications'
  | 'Document desk'
  | 'Customers'
  | 'Customize master data'
  | 'Notifications'
  | 'Activity';

export const CRM_PAGES: {name: CrmPageName; href: string; authority: string}[] = [
  {name: 'Overview', href: CRM_BASE, authority: 'crm_view_overview'},
  {name: 'Applications', href: `${CRM_BASE}/applications`, authority: 'crm_view_applications'},
  {name: 'Document desk', href: `${CRM_BASE}/document-desk`, authority: 'crm_view_document_desk'},
  {name: 'Customers', href: `${CRM_BASE}/customers`, authority: 'crm_view_customers'},
  {name: 'Customize master data', href: `${CRM_BASE}/master-data`, authority: 'crm_view_master_data'},
  {name: 'Notifications', href: `${CRM_BASE}/notifications`, authority: 'crm_view_notifications'},
  {name: 'Activity', href: `${CRM_BASE}/activity`, authority: 'crm_view_activity'},
];

export const pageHref = (name: string) => CRM_PAGES.find(page => page.name === name)?.href ?? CRM_BASE;

export const applicationHref = (id: string, tab?: number) =>
  `${CRM_BASE}/applications/${id}${tab === undefined ? '' : `?tab=${tab}`}`;

export const newApplicationHref = (customerId?: string) =>
  `${CRM_BASE}/applications/new${customerId ? `?customer=${encodeURIComponent(customerId)}` : ''}`;
