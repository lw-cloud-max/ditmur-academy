import NextAuth, { type DefaultSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/prisma';
import { checkPassword, hashPassword, isKnownDemoPassword } from '@/lib/passwords';
import { findUniqueStaffOrParentByEmail } from '@/lib/email-account-lookup';

const googleClientId = process.env.AUTH_GOOGLE_ID?.trim();
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET?.trim();
const googleProvider = googleClientId && googleClientSecret
  ? GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      authorization: { params: { prompt: 'select_account' } }
    })
  : null;

function isVerifiedGoogleProfile(profile: unknown): boolean {
  return !!profile && typeof profile === 'object' &&
    (profile as { email_verified?: unknown }).email_verified === true;
}

declare module 'next-auth' {
  interface Session {
    user: { id: string; role: string; mustChangePassword?: boolean; sessionVersion?: number; staffRole?: string } & DefaultSession['user'];
  }
  interface User { role?: string; mustChangePassword?: boolean; sessionVersion?: number; staffRole?: string; }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [CredentialsProvider({
    name: 'Credentials',
    credentials: {
      username: { label: 'Username/Email', type: 'text' },
      password: { label: 'Password', type: 'password' },
      roleType: { label: 'Role Type', type: 'text' }
    },
    async authorize(credentials) {
      if (typeof credentials?.username !== 'string' || typeof credentials?.password !== 'string') return null;
      const username = credentials.username.trim();
      const password = credentials.password;
      if (!username || !password) return null;
      if (credentials.roleType === 'STAFF') {
        const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
        if (username.toLowerCase() === 'admin@ditmur.com') {
          if (!superAdminPassword || isKnownDemoPassword(superAdminPassword) || password !== superAdminPassword) return null;
          return { id: 'admin-1', name: 'System Admin', email: 'admin@ditmur.com', role: 'ADMIN', mustChangePassword: false, sessionVersion: 0 };
        }
        const staff = await prisma.staff.findFirst({
          where: { email: { equals: username, mode: 'insensitive' } },
          select: { id: true, firstName: true, lastName: true, email: true, role: true, status: true, passwordHash: true, mustChangePassword: true, sessionVersion: true }
        });
        if (!staff || staff.status !== 'ACTIVE') return null;
        const checked = await checkPassword(staff.passwordHash, password);
        if (!checked.valid) return null;
        if (checked.upgrade) await prisma.staff.update({ where: { id: staff.id }, data: { passwordHash: await hashPassword(password), mustChangePassword: true } });
        const role = staff.role === 'ACCOUNTANT' ? 'ACCOUNTANT' : staff.role === 'ADMIN' ? 'ADMIN' : 'STAFF';
        return { id: staff.id, name: `${staff.firstName} ${staff.lastName}`, email: staff.email,
          role, staffRole: staff.role, mustChangePassword: checked.upgrade || staff.mustChangePassword, sessionVersion: staff.sessionVersion };
      }
      if (credentials.roleType === 'STUDENT') {
        const student = await prisma.student.findUnique({ where: { id: username.toUpperCase() },
          select: { id: true, firstName: true, lastName: true, status: true, password: true, mustChangePassword: true, sessionVersion: true } });
        if (!student || student.status !== 'ACTIVE') return null;
        const checked = await checkPassword(student.password, password);
        if (!checked.valid) return null;
        if (checked.upgrade) await prisma.student.update({ where: { id: student.id }, data: { password: await hashPassword(password), mustChangePassword: true } });
        return { id: student.id, name: `${student.firstName} ${student.lastName}`, email: null,
          role: 'STUDENT', mustChangePassword: checked.upgrade || student.mustChangePassword, sessionVersion: student.sessionVersion };
      }
      if (credentials.roleType === 'PARENT') {
        // A parent email was not historically unique. Finding the first row can
        // reject a valid reset on a second row, or select the wrong family.
        const parents = await prisma.parent.findMany({ where: { email: { equals: username, mode: 'insensitive' } },
          select: { id: true, fullName: true, email: true, password: true, mustChangePassword: true, sessionVersion: true } });
        let match: { parent: (typeof parents)[number]; upgrade: boolean } | null = null;
        for (const parent of parents) {
          const checked = await checkPassword(parent.password, password);
          if (!checked.valid) continue;
          // If two households have the same email AND password, it would be
          // unsafe to guess which parent was intended. Admin must reset one.
          if (match) return null;
          match = { parent, upgrade: checked.upgrade };
        }
        if (!match) return null;
        const { parent, upgrade } = match;
        if (upgrade) await prisma.parent.update({ where: { id: parent.id }, data: { password: await hashPassword(password), mustChangePassword: true } });
        return { id: parent.id, name: parent.fullName, email: parent.email,
          role: 'PARENT', mustChangePassword: upgrade || parent.mustChangePassword, sessionVersion: parent.sessionVersion };
      }
      return null;
    }
  }), ...(googleProvider ? [googleProvider] : [])],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'google') return true;
      if (!isVerifiedGoogleProfile(profile) || !user.email) return false;
      // Only link to exactly one existing active Staff or Parent account. No
      // student or environment-managed super-admin account is eligible.
      return !!(await findUniqueStaffOrParentByEmail(user.email));
    },
    async jwt({ token, user, account, profile }) {
      if (account?.provider === 'google') {
        if (!isVerifiedGoogleProfile(profile) || !user?.email) throw new Error('Google account could not be verified.');
        const localAccount = await findUniqueStaffOrParentByEmail(user.email);
        if (!localAccount) throw new Error('Google account did not match one unique school account.');
        token.id = localAccount.id;
        token.role = localAccount.role;
        token.name = localAccount.name;
        token.email = localAccount.email;
        token.staffRole = localAccount.staffRole;
        // Accounts with no local password may use their verified Google login.
        // Existing temporary passwords remain subject to the normal change rule.
        token.mustChangePassword = localAccount.passwordConfigured ? localAccount.mustChangePassword : false;
        token.sessionVersion = localAccount.sessionVersion;
      } else if (user) {
        token.role = user.role;
        token.id = user.id;
        token.mustChangePassword = user.mustChangePassword;
        token.sessionVersion = user.sessionVersion;
        token.staffRole = user.staffRole;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = String(token.role || '');
        session.user.id = String(token.id || '');
        session.user.mustChangePassword = token.mustChangePassword !== false;
        session.user.sessionVersion = typeof token.sessionVersion === 'number' ? token.sessionVersion : -1;
        session.user.staffRole = typeof token.staffRole === 'string' ? token.staffRole : undefined;
      }
      return session;
    },
    redirect({ url, baseUrl }) {
      // Avoid old Vercel aliases after OAuth; production returns use the
      // school's canonical host. Local development remains on its own origin.
      const safeBase = process.env.NODE_ENV === 'production' ? 'https://www.ditmuracademy.com' : baseUrl;
      try {
        const target = new URL(url, safeBase);
        return target.origin === new URL(safeBase).origin ? target.toString() : safeBase;
      } catch {
        return safeBase;
      }
    }
  },
  pages: { signIn: '/login', error: '/login' },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  cookies: {
    sessionToken: { name: 'next-auth.session-token', options: { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' } },
    csrfToken: { name: 'next-auth.csrf-token', options: { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' } }
  },
  secret: process.env.AUTH_SECRET
});
