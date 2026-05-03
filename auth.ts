import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { findOrCreateUser } from "@/lib/authDb";
import { getAuthContext, authContext } from "@/lib/authContext";

function extractIP(request: Request): string | null {
  // Check if request has .ip property (NextRequest extension)
  const ip = (request as { ip?: string }).ip;
  if (ip) return ip.replace(/^::ffff:/, '');

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim().replace(/^::ffff:/, '');
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.replace(/^::ffff:/, '');
  return null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ request }) {
      // Capture IP early — enterWith persists for all subsequent async calls
      // Only override context if we actually found an IP (don't clobber with null)
      if (request) {
        const ip = extractIP(request);
        if (ip) authContext.enterWith({ ip });
      }
      return true;
    },
    async jwt({ token, account, profile }) {
      // On first sign-in, find/create user in DB and store role
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
        token.email = profile.email!;
        token.name = profile.name || token.name;
        token.picture = (profile as { picture?: string }).picture || null;
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
