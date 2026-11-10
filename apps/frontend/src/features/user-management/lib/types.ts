/** User-management data shapes and the tab list. */

export type Row = Record<string, any>;

export type Overview = {
  users: Row[];
  applications: Row[];
  roles: Row[];
  authorities: Row[];
  roleAuthorities: {role_id: number; authority_id: number}[];
  audits: Row[];
  sessions: Row[];
};

export type Tab = 'users' | 'roles' | 'authorities' | 'applications' | 'audit' | 'sessions';

/** Tab order and icons of the System Administration console. */
export const TABS: {key: Tab; label: string; icon: string}[] = [
  {key: 'users', label: 'Users', icon: 'fa-users'},
  {key: 'applications', label: 'Apps', icon: 'fa-layer-group'},
  {key: 'roles', label: 'Roles', icon: 'fa-user-tag'},
  {key: 'authorities', label: 'Authorities', icon: 'fa-key'},
  {key: 'audit', label: 'Audit', icon: 'fa-history'},
  {key: 'sessions', label: 'Sessions', icon: 'fa-sign-in-alt'},
];
