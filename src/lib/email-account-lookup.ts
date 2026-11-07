import { prisma } from '@/lib/prisma';
import { normalizeEmail } from '@/lib/normalize-email';

export type SchoolEmailAccount = {
  kind: 'STAFF' | 'PARENT';
  id: string;
  email: string;
  name: string;
  role: string;
  staffRole?: string;
  mustChangePassword: boolean;
  sessionVersion: number;
  passwordConfigured: boolean;
};

/**
 * Return a local Staff or Parent account only when its email identifies exactly
 * one account across both tables. Parent emails are not unique in the database,
 * so ambiguous matches must never be guessed. The built-in environment-managed
 * super-admin identity is intentionally excluded.
 */
export async function findUniqueStaffOrParentByEmail(value: unknown): Promise<SchoolEmailAccount | null> {
  const email = normalizeEmail(value);
  if (!email || email === 'admin@ditmur.com') return null;

  const [staffMatches, parentMatches] = await Promise.all([
    prisma.staff.findMany({
      where: { email: { equals: email, mode: 'insensitive' } },
      take: 2,
      select: {
        id: true, firstName: true, lastName: true, email: true, role: true,
        status: true, passwordHash: true, mustChangePassword: true, sessionVersion: true
      }
    }),
    prisma.parent.findMany({
      where: { email: { equals: email, mode: 'insensitive' } },
      take: 2,
      select: {
        id: true, fullName: true, email: true, password: true,
        mustChangePassword: true, sessionVersion: true
      }
    })
  ]);

  if (staffMatches.length + parentMatches.length !== 1) return null;

  if (staffMatches.length === 1) {
    const staff = staffMatches[0];
    if (staff.status !== 'ACTIVE' || !staff.email) return null;
    const role = staff.role === 'ACCOUNTANT' ? 'ACCOUNTANT' : staff.role === 'ADMIN' ? 'ADMIN' : 'STAFF';
    return {
      kind: 'STAFF',
      id: staff.id,
      email: staff.email,
      name: `${staff.firstName} ${staff.lastName}`.trim(),
      role,
      staffRole: staff.role,
      mustChangePassword: staff.mustChangePassword,
      sessionVersion: staff.sessionVersion,
      passwordConfigured: !!staff.passwordHash
    };
  }

  const parent = parentMatches[0];
  if (!parent.email) return null;
  return {
    kind: 'PARENT',
    id: parent.id,
    email: parent.email,
    name: parent.fullName,
    role: 'PARENT',
    mustChangePassword: parent.mustChangePassword,
    sessionVersion: parent.sessionVersion,
    passwordConfigured: !!parent.password
  };
}
