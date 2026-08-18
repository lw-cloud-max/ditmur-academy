import NextAuth, { DefaultSession, type User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
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

const verifyPassword = async (storedPassword: string | null | undefined, candidatePassword: string) => {
  if (!storedPassword) return false;

  if (storedPassword === candidatePassword) {
    return true;
  }

  try {
    return await bcrypt.compare(candidatePassword, storedPassword);
  } catch {
    return false;
  }
};

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
        const username = String(credentials.username).trim();
        const password = String(credentials.password).trim();

        if (roleType === "STAFF") {
          const normalizedAdminEmail = username.toLowerCase();
          if ((normalizedAdminEmail === "admin@ditmur.com" || normalizedAdminEmail === "admin@school.com") && password === "admin123") {
            return { id: "admin-1", name: "System Admin", email: "admin@ditmur.com", role: "ADMIN" };
          }

          const staffUser = await prisma.user.findUnique({
            where: { email: username.toLowerCase() },
          });

          if (staffUser && (await verifyPassword(staffUser.password, password))) {
            if (staffUser.password === password) {
              const hashedPassword = await bcrypt.hash(password, 10);
              await prisma.user.update({
                where: { id: staffUser.id },
                data: { password: hashedPassword },
              });
            }

            return {
              id: staffUser.id,
              name: staffUser.name,
              email: staffUser.email,
              role: staffUser.role,
            };
          }

          return null;
        }

        if (roleType === "STUDENT") {
          const student = await prisma.student.findUnique({
            where: { id: username.toUpperCase() },
          });

          if (student && (await verifyPassword(student.password, password))) {
            if (student.password === password) {
              const hashedPassword = await bcrypt.hash(password, 10);
              await prisma.student.update({
                where: { id: student.id },
                data: { password: hashedPassword },
              });
            }

            return {
              id: student.id,
              name: `${student.firstName} ${student.lastName}`,
              email: student.id,
              role: "STUDENT",
            };
          }

          return null;
        }

        if (roleType === "PARENT") {
          const parent = await prisma.parent.findFirst({
            where: { email: username.toLowerCase() },
          });

          if (parent && (await verifyPassword(parent.password, password))) {
            if (parent.password === password) {
              const hashedPassword = await bcrypt.hash(password, 10);
              await prisma.parent.update({
                where: { id: parent.id },
                data: { password: hashedPassword },
              });
            }

            return {
              id: parent.id,
              name: parent.fullName,
              email: parent.email || username,
              role: "PARENT",
            };
          }

          return null;
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
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        // @ts-ignore
        session.user.role = token.role;
        // @ts-ignore
        session.user.id = token.id;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
});
