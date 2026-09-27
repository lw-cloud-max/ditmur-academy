// The existing hardcoded admin account is the only super-admin identity.
// Accountant login is reserved for the upcoming individual staff-login work;
// assigning a Staff.directory role alone does NOT grant an authenticated role.
export type Actor = { user?: { id?: string; role?: string } } | null | undefined;

export function isSuperAdmin(session: Actor): boolean {
  return session?.user?.role === 'ADMIN' && session.user.id === 'admin-1';
}

export function canViewSchoolFinance(session: Actor): boolean {
  return isSuperAdmin(session) || session?.user?.role === 'ACCOUNTANT';
}
