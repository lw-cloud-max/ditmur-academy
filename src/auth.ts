import NextAuth, { DefaultSession, type User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

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
        
        // ------------------------------------
        // FAILSAFE: BYPASS DATABASE ENTIRELY
        // ------------------------------------
        
        if (roleType === "STAFF") {
          return { id: "admin-1", name: "System Admin", email: "admin@school.com", role: "ADMIN" };
        }
        
        if (roleType === "STUDENT") {
          // Literally just log them in as a student using whatever they typed as their ID
          return { id: username.toUpperCase(), name: "Test Student", email: username.toUpperCase(), role: "STUDENT" };
        }

        if (roleType === "PARENT") {
          return { id: username, name: "Test Parent", email: username, role: "PARENT" };
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
});
