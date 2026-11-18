/**
 * Dynamic table names for User Management subsystem.
 * Driven by process.env.USER_MANAGEMENT (defaults to 'users_').
 *
 * Example:
 * If USER_MANAGEMENT="users_", USER_TABLES.users -> "`users_users`"
 * If USER_MANAGEMENT="um_", USER_TABLES.users -> "`um_users`"
 */
const IDENTIFIER = /^[A-Za-z0-9_]*$/;

export const USER_MANAGEMENT = (process.env.USER_MANAGEMENT ?? 'users_').trim();

if (!IDENTIFIER.test(USER_MANAGEMENT))
  throw new Error(`USER_MANAGEMENT "${USER_MANAGEMENT}" is not valid: use letters, digits and underscores only.`);

/** Quoted, prefixed name of a user table: userTable('users'). */
export function userTable(baseName: string): string {
  if (!baseName || !IDENTIFIER.test(baseName)) throw new Error(`Invalid user table name "${baseName}".`);
  return `\`${USER_MANAGEMENT}${baseName}\``;
}

export const USER_TABLES = {
  users: userTable('users'),
  departments: userTable('departments'),
  roles: userTable('roles'),
  authorities: userTable('authorities'),
  role_authorities: userTable('role_authorities'),
  user_app_roles: userTable('user_app_roles'),
  applications: userTable('applications'),
  session_logs: userTable('session_logs'),
  audit_logs: userTable('audit_logs'),
  vapid_keys: userTable('vapid_keys'),
  web_push_subscriptions: userTable('web_push_subscriptions'),
} as const;
