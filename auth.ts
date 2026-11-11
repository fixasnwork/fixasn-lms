import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { findOrCreateUser } from "@/lib/authDb";
import { getAuthContext } from "@/lib/authContext";
import prisma from "@/lib/prisma";
import { isAdminRole } from "@/lib/deviceSession";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Cloudflare proxies requests; explicitly trust its forwarded host headers.
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // On first sign-in, find/create user in DB
      if (account && profile) {
        const ctx = getAuthContext();
        const ip = ctx?.ip || null;

        const user = await findOrCreateUser(
          profile.email!,
          profile.name || token.name as string,
          (profile as { picture?: string }).picture || null,
          "system",
          ip,
        );
        token.role = user.role;
        token.email = user.email;

        if (!isAdminRole(user.role)) {
          const nextSessionVersion = (user.activeSessionVersion ?? 0) + 1;
          await prisma.user.update({
            where: { email: user.email },
            data: {
              activeSessionVersion: nextSessionVersion,
              activeDeviceSecretHash: null,
            },
          });
          token.activeSessionVersion = nextSessionVersion;
        } else {
          delete token.activeSessionVersion;
        }
      }

      // Always refresh token from database so profile edits (name/avatar)
      // are reflected in the session on next request.
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { name: true, avatar: true, role: true, email: true, activeSessionVersion: true, isBlocked: true },
        });
        if (dbUser) {
          token.name = dbUser.name;
          token.picture = dbUser.avatar;
          token.role = dbUser.role;
          token.email = dbUser.email;

          // Reject banned user — prevent session from being issued
          if (dbUser.isBlocked) {
            token.isBlocked = true;
            return token;
          }

          if (!isAdminRole(dbUser.role)) {
            const tokenVersion = typeof token.activeSessionVersion === "number"
              ? token.activeSessionVersion
              : null;
            token.isSessionStale =
              tokenVersion === null ||
              dbUser.activeSessionVersion === null ||
              tokenVersion !== dbUser.activeSessionVersion;
          } else {
            token.isSessionStale = false;
            delete token.activeSessionVersion;
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Make user info + role available in client session
      if (session.user) {
        session.user.email = token.email || session.user.email;
        session.user.name = token.name || session.user.name;
        session.user.image = (token.picture as string) || session.user.image;
        (session.user as { avatar?: string | null }).avatar = token.picture || null;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { activeSessionVersion?: number }).activeSessionVersion =
          typeof token.activeSessionVersion === "number" ? token.activeSessionVersion : undefined;
        (session as { isSessionStale?: boolean }).isSessionStale = token.isSessionStale === true;
        (session as { isBlocked?: boolean }).isBlocked = token.isBlocked === true;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // After sign-in, redirect to appropriate dashboard
      if (url.startsWith(baseUrl)) {
        return url;
      }
      // Default: go to dashboard
      return `${baseUrl}/dashboard`;
    },
  },
  pages: {
    signIn: "/login",
  },
});
