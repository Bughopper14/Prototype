/** Activity feed and notification shapes. */

/**
 * Unified Activity & Notification Tracker for Liugong CRM Dashboard
 * Supports real-time logging, persistent unread state, section linking, and WhatsApp-like dismissal.
 * NOTE: Strictly records genuine user actions — NO dummy or placeholder template data.
 */

export interface ActivityChangeItem {
  section?: string; // Bagian (e.g. "Customer & PIC", "Pre Analysis form")
  subSection?: string; // Sub Section (e.g. "Registration Office & Company Domicile")
  field?: string; // Column field key (e.g. "companyAddress")
  label: string; // Column label (e.g. "Company Address")
  oldValue?: string; // Previous value
  newValue?: string; // New value
}

export interface SystemActivity {
  id: string;
  applicationId?: string;
  fapNumber?: string;
  companyName: string;
  section: string;
  tabIndex: number;
  actionType: 'CREATE' | 'UPDATE' | 'APPROVE' | 'SUBMIT' | 'VERIFY' | 'LOCK' | 'REJECT';
  title: string;
  details: string;
  changes?: ActivityChangeItem[];
  actionBy: string;
  userRole: string;
  timestamp: string;
  read?: boolean;
}

export interface SystemNotificationItem {
  id: string;
  applicationId?: string;
  fapNumber?: string;
  companyName: string;
  section?: string;
  tabIndex?: number;
  title: string;
  message: string;
  priority?: 'high' | 'normal';
  taskType?: string;
  createdAt: string;
  readAt?: string | null;
}
