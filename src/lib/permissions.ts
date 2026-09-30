// The environment-backed admin account is the only super-admin identity.
// Accountants authenticate via their own active Staff record and bcrypt hash.
export type Actor = { user?: { id?: string; role?: string; staffRole?: string } } | null | undefined;

export function isSuperAdmin(session: Actor): boolean {
  return session?.user?.role === 'ADMIN' && session.user.id === 'admin-1';
}

export function canViewSchoolFinance(session: Actor): boolean {
  return isSuperAdmin(session) || session?.user?.role === 'ACCOUNTANT' ||
    (session?.user?.role === 'STAFF' && session.user.staffRole === 'ACCOUNTANT_TEACHER');
}
