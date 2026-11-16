/**
 * Dynamic table names for User Management subsystem.
 * Driven by process.env.USER_MANAGEMENT (defaults to 'users_').
 *
 * Example:
 * If USER_MANAGEMENT="users_", USER_TABLES.users -> "users_users"
 * If USER_MANAGEMENT="um_", USER_TABLES.users -> "um_users"
 */
export const USER_MANAGEMENT = (process.env.USER_MANAGEMENT ?? 'users_').trim();

export const USER_TABLES = {
  users: `${USER_MANAGEMENT}users`,
  roles: `${USER_MANAGEMENT}roles`,
  authorities: `${USER_MANAGEMENT}authorities`,
  role_authorities: `${USER_MANAGEMENT}role_authorities`,
  user_app_roles: `${USER_MANAGEMENT}user_app_roles`,
  applications: `${USER_MANAGEMENT}applications`,
  session_logs: `${USER_MANAGEMENT}session_logs`,
  audit_logs: `${USER_MANAGEMENT}audit_logs`,
  vapid_keys: `${USER_MANAGEMENT}vapid_keys`,
  web_push_subscriptions: `${USER_MANAGEMENT}web_push_subscriptions`,
} as const;

export function userTable(baseName: string): string {
  return `${USER_MANAGEMENT}${baseName}`;
}

