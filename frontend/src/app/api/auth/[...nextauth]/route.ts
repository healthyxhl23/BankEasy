// app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";

// Extend the built-in session types
type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  onboarded: boolean;
};

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("SignIn callback - User:", user.email);
      // Always allow sign in - we'll handle profile creation later
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user && token.sub) {
        const sessionUser = session.user as SessionUser;
        sessionUser.id = token.sub;
        // Default to not onboarded - we'll check this separately
        sessionUser.onboarded = false;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Always redirect to home after sign in
      return `${baseUrl}/home`;
    }
  },
  pages: {
    signIn: '/signin',
    error: '/auth/error',
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };