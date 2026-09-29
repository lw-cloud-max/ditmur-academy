import NextAuth, { type DefaultSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import { checkPassword, hashPassword, isKnownDemoPassword } from '@/lib/passwords';

declare module 'next-auth' {
  interface Session {
    user: { id: string; role: string; mustChangePassword?: boolean; sessionVersion?: number } & DefaultSession['user'];
  }
  interface User { role?: string; mustChangePassword?: boolean; sessionVersion?: number; }
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
          role, mustChangePassword: checked.upgrade || staff.mustChangePassword, sessionVersion: staff.sessionVersion };
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
        const parent = await prisma.parent.findFirst({ where: { email: { equals: username, mode: 'insensitive' } },
          select: { id: true, fullName: true, email: true, password: true, mustChangePassword: true, sessionVersion: true } });
        if (!parent) return null;
        const checked = await checkPassword(parent.password, password);
        if (!checked.valid) return null;
        if (checked.upgrade) await prisma.parent.update({ where: { id: parent.id }, data: { password: await hashPassword(password), mustChangePassword: true } });
        return { id: parent.id, name: parent.fullName, email: parent.email,
          role: 'PARENT', mustChangePassword: checked.upgrade || parent.mustChangePassword, sessionVersion: parent.sessionVersion };
      }
      return null;
    }
  })],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.mustChangePassword = user.mustChangePassword;
        token.sessionVersion = user.sessionVersion;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = String(token.role || '');
        session.user.id = String(token.id || '');
        session.user.mustChangePassword = token.mustChangePassword !== false;
        session.user.sessionVersion = typeof token.sessionVersion === 'number' ? token.sessionVersion : -1;
      }
      return session;
    }
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  cookies: {
    sessionToken: { name: 'next-auth.session-token', options: { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' } },
    csrfToken: { name: 'next-auth.csrf-token', options: { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' } }
  },
  secret: process.env.AUTH_SECRET
});
