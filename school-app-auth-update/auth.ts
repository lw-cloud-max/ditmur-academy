import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // HARDCODED MOCK USER FOR NOW (We will connect to DB later)
        if (
          credentials?.email === "admin@school.com" &&
          credentials?.password === "admin123"
        ) {
          return {
            id: "1",
            name: "System Admin",
            email: "admin@school.com",
            role: "ADMIN"
          };
        }
        return null;
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login", // We are going to build this custom login page next
  },
});
