import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const protectedRoutes = ["/dashboard", "/admin"];
// Routes to redirect away from when authenticated
const authRoutes = ["/login"];

export default auth(async (req: NextRequest) => {
  const { pathname } = req.nextUrl;
  const session = await auth();
  const isLoggedIn = !!session;
  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  // Redirect logged-in users away from /login
  if (authRoutes.some((route) => pathname.startsWith(route)) && isLoggedIn) {
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
