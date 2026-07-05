// frontend/src/app/api/auth/[...nextauth]/route.ts
//
// NextAuth v4 — Google OAuth Provider Configuration
// ─────────────────────────────────────────────────────────────────────────────
// This file is the single source of truth for authentication.
// It configures the Google provider, customizes the session/JWT to include
// the user's email, and exports the HTTP handlers for Next.js App Router.
// ─────────────────────────────────────────────────────────────────────────────

import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  // ── Providers ────────────────────────────────────────────────────────────
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID     ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],

  // ── JWT + Session Callbacks ───────────────────────────────────────────────
  // We persist the user's email into the JWT token so every request has access
  // to the user's identity without hitting a database.
  callbacks: {
    async jwt({ token, user }) {
      // On first sign-in, `user` is populated — persist the email into the token
      if (user?.email) {
        token.email = user.email;
      }
      return token;
    },

    async session({ session, token }) {
      // Expose the email on the client-side session object
      if (token.email) {
        session.user = session.user ?? {};
        session.user.email = token.email as string;
      }
      return session;
    },
  },

  // ── Pages ─────────────────────────────────────────────────────────────────
  // Use the default NextAuth sign-in page; we'll customize this in a later phase.
  pages: {
    signIn: "/auth/signin",
  },

  // ── Session Strategy ──────────────────────────────────────────────────────
  // "jwt" means sessions are stored in encrypted cookies — no database adapter
  // needed. Perfect for hackathon scale; upgrade to a DB adapter for production.
  session: {
    strategy: "jwt",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

// Export the GET and POST handlers for the Next.js App Router
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
