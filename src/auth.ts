import NextAuth, { DefaultSession, type User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

// Extend NextAuth types to include our custom 'role' property
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"]
  }

  interface User {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  }
}

// NextAuth Configuration
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username/Email", type: "text" },
        password: { label: "Password", type: "password" },
        roleType: { label: "Role Type", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        
        const roleType = credentials.roleType as string;
        const username = credentials.username as string;
        const password = credentials.password as string;
        
        // Ensure specific hardcoded login for ADMIN to prevent board members logging in with arbitrary emails
        if (roleType === "STAFF") {
          // SUPER_ADMIN_PASSWORD should be set in Vercel before launch. The
          // legacy default remains temporarily so an existing admin is not
          // locked out by this update; do not use it for live school finances.
          if (username.toLowerCase() === "admin@ditmur.com" && password === (process.env.SUPER_ADMIN_PASSWORD || "admin123")) {
            return { id: "admin-1", name: "System Admin", email: "admin@ditmur.com", role: "ADMIN" };
          }
          return null;
        }
        
        if (roleType === "STUDENT") {
          const student = await prisma.student.findUnique({
            where: { id: username.toUpperCase().trim() },
            select: { id: true, firstName: true, lastName: true, password: true, status: true }
          });
          if (!student || student.status !== 'ACTIVE' || student.password !== password) return null;
          return { id: student.id, name: `${student.firstName} ${student.lastName}`, email: null, role: "STUDENT" };
        }

        if (roleType === "PARENT") {
          // Look up the actual parent record in the database to get the real ID
          const parent = await prisma.parent.findFirst({
            where: { email: username }
          });
          
          if (!parent) {
            return null;
          }
          
          // Validate password (default password is "parent123")
          if (parent.password !== password) {
            return null;
          }
          
          return { id: parent.id, name: parent.fullName, email: parent.email, role: "PARENT" };
        }

        return null;
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        // @ts-ignore
        token.role = user.role;
        token.id = user.id; // Map custom ID to token
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        // @ts-ignore
        session.user.role = token.role;
        // @ts-ignore
        session.user.id = token.id; // Map custom ID back to session
      }
      return session;
    }
  },
  pages: {
    signIn: "/login", 
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  secret: process.env.AUTH_SECRET,
});
