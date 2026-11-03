

export const getGalleryUrl = () => '/gallery';

export function getLoginUrl(reason?: string): string {
  const params = new URLSearchParams({next: '/crm-dashboard'});
  if (reason) params.set('reason', reason);
  return `/login?${params}`;
}

export function redirectToGlobalLogin(reason?: string): void {
  if (typeof window === 'undefined') return;
  window.location.replace(getLoginUrl(reason));
}

export function checkIsAdmin(u: any): boolean {
  if (!u) return false;
  return Boolean(
    u.isAdmin ||
    u.is_admin ||
    u.role === 'ADMIN' ||
    u.roleBadge === 'ADMIN' ||
    u.displayRole === 'Administrator' ||
    String(u.username || '').toLowerCase() === 'admin' ||
    String(u.email || '').toLowerCase().includes('admin') ||
    String(u.email || '').toLowerCase() === 'axel@liugongfinance.com'
  );
}

export function hasAuthority(u: any, authorityName: string): boolean {
  if (!u) return false;
  if (checkIsAdmin(u)) return true;
  if (Array.isArray(u.authorities)) {
    return u.authorities.includes(authorityName);
  }
  const roleCode = String(u.role || '').toUpperCase();
  const defaults: Record<string, string[]> = {
    MKT: [
      'access_crm_dashboard', 'crm_view_overview', 'crm_view_applications', 'crm_create_application',
      'crm_view_customers', 'crm_manage_customers', 'crm_view_notifications',
      'crm_quick_add_master_option', 'crm_view_app_customer_pic', 'crm_edit_app_customer_pic',
      'crm_workflow_submit'
    ],
    BS: [
      'access_crm_dashboard', 'crm_view_overview', 'crm_view_applications', 'crm_view_document_desk',
      'crm_manage_document_desk', 'crm_view_customers', 'crm_manage_customers', 'crm_view_master_data',
      'crm_manage_master_data', 'crm_view_notifications', 'crm_view_activity',
      'crm_quick_add_master_option', 'crm_view_app_customer_pic', 'crm_view_app_legal',
      'crm_view_app_stakeholders', 'crm_view_app_business_banks', 'crm_view_app_financial',
      'crm_view_app_documents', 'crm_view_app_financing_units', 'crm_view_app_activity',
      'crm_edit_app_customer_pic', 'crm_edit_app_legal', 'crm_verify_app_documents',
      'crm_workflow_verify_bs', 'crm_workflow_start_review'
    ],
    HEAD_BS: [
      'access_crm_dashboard', 'crm_view_overview', 'crm_view_applications', 'crm_view_document_desk',
      'crm_manage_document_desk', 'crm_view_customers', 'crm_manage_customers', 'crm_view_master_data',
      'crm_manage_master_data', 'crm_view_notifications', 'crm_view_activity',
      'crm_quick_add_master_option', 'crm_view_app_customer_pic', 'crm_view_app_legal',
      'crm_view_app_stakeholders', 'crm_view_app_business_banks', 'crm_view_app_financial',
      'crm_view_app_documents', 'crm_view_app_financing_units', 'crm_view_app_activity',
      'crm_verify_app_documents', 'crm_workflow_verify_bs', 'crm_workflow_start_review'
    ],
    CA: [
      'access_crm_dashboard', 'crm_view_overview', 'crm_view_applications', 'crm_view_document_desk',
      'crm_view_customers', 'crm_view_notifications', 'crm_view_activity',
      'crm_view_app_customer_pic', 'crm_view_app_legal', 'crm_view_app_stakeholders',
      'crm_view_app_business_banks', 'crm_view_app_financial', 'crm_view_app_documents',
      'crm_view_app_financing_units', 'crm_view_app_activity', 'crm_edit_app_business_banks',
      'crm_edit_app_financial', 'crm_verify_app_documents', 'crm_workflow_signoff_ca', 'crm_workflow_return'
    ],
    LEGAL: [
      'access_crm_dashboard', 'crm_view_overview', 'crm_view_applications', 'crm_view_document_desk',
      'crm_view_customers', 'crm_view_notifications', 'crm_view_activity',
      'crm_view_app_legal', 'crm_view_app_stakeholders', 'crm_view_app_business_banks',
      'crm_view_app_financial', 'crm_edit_app_legal', 'crm_edit_app_stakeholders',
      'crm_workflow_signoff_legal', 'crm_workflow_return'
    ],
    COMMITTEE: [
      'access_crm_dashboard', 'crm_view_overview', 'crm_view_applications', 'crm_view_document_desk',
      'crm_view_customers', 'crm_view_notifications', 'crm_view_activity',
      'crm_view_app_customer_pic', 'crm_view_app_legal', 'crm_view_app_stakeholders',
      'crm_view_app_business_banks', 'crm_view_app_financial', 'crm_view_app_documents',
      'crm_view_app_financing_units', 'crm_view_app_activity', 'crm_workflow_committee', 'crm_workflow_return'
    ],
    QA: [
      'access_crm_dashboard', 'crm_view_applications', 'crm_view_document_desk',
      'crm_view_customers', 'crm_view_notifications', 'crm_view_activity',
      'crm_view_app_customer_pic', 'crm_view_app_legal', 'crm_view_app_stakeholders',
      'crm_view_app_business_banks', 'crm_view_app_financial', 'crm_view_app_documents',
      'crm_view_app_financing_units', 'crm_view_app_activity', 'crm_workflow_start_review'
    ],
    FINANCE: [
      'access_crm_dashboard', 'crm_view_overview', 'crm_view_applications',
      'crm_view_app_financial', 'crm_view_app_documents', 'crm_view_app_financing_units',
      'crm_view_app_activity', 'crm_edit_app_business_banks', 'crm_edit_app_financing_units',
      'crm_edit_app_financial'
    ]
  };
  return Boolean(defaults[roleCode]?.includes(authorityName));
}
