import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  buildLoginRedirectWithReason,
  clearDeviceSecretCookie,
  DEVICE_SECRET_COOKIE_NAME,
  getEmailFromSessionUser,
  getRoleFromSessionUser,
  getTokenSessionVersionFromSessionUser,
  isAdminRole,
  validateNonAdminActiveSession,
} from "@/lib/deviceSession";

// Routes that require authentication
const protectedRoutes = ["/dashboard", "/admin"];
// Routes to redirect away from when authenticated
const authRoutes = ["/login"];

export default auth(async (req: NextRequest) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const isLoggedIn = !!session;
  const role = getRoleFromSessionUser(session?.user);
  const isAdmin = isAdminRole(role);
  const isStale = (session as { isSessionStale?: boolean } | null)?.isSessionStale === true;
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  if (isAuthRoute && req.nextUrl.searchParams.get("reason") === "device-replaced") {
    const response = NextResponse.next();
    clearDeviceSecretCookie(response);
    return response;
  }

  if (isLoggedIn && !isAdmin) {
    if (isStale) {
      const redirect = NextResponse.redirect(buildLoginRedirectWithReason(req));
      clearDeviceSecretCookie(redirect);
      return redirect;
    }

    const email = getEmailFromSessionUser(session?.user);
    const tokenSessionVersion = getTokenSessionVersionFromSessionUser(session?.user);
    const deviceSecret = req.cookies.get(DEVICE_SECRET_COOKIE_NAME)?.value;

    if (!email) {
      const redirect = NextResponse.redirect(buildLoginRedirectWithReason(req));
      clearDeviceSecretCookie(redirect);
      return redirect;
    }

    const activeCheck = await validateNonAdminActiveSession({
      email,
      tokenSessionVersion,
      deviceSecret,
    });

    if (!activeCheck.ok) {
      if (activeCheck.reason === "missing-device-secret-hash") {
        return NextResponse.next();
      }
      const redirect = NextResponse.redirect(buildLoginRedirectWithReason(req));
      clearDeviceSecretCookie(redirect);
      return redirect;
    }
  }

  // Redirect logged-in users away from /login
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(
      new URL(isAdmin ? "/admin" : "/dashboard", req.url)
    );
  }

  // Redirect admin users from /dashboard to /admin
  if (pathname.startsWith("/dashboard") && isLoggedIn && isAdmin) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  // Protect dashboard & admin routes
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
