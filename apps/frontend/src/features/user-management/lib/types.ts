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

export const TABS: {key: Tab; label: string}[] = [
  {key: 'users', label: 'Users'},
  {key: 'roles', label: 'Roles'},
  {key: 'authorities', label: 'Authorities'},
  {key: 'applications', label: 'Applications'},
  {key: 'audit', label: 'Audit log'},
  {key: 'sessions', label: 'Sessions'},
];
