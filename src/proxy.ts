import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "spotlab_session";
const PUBLIC_PATHS = ["/login", "/register"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (!hasSession && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (hasSession && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // PWA install assets (manifest, icon route, service worker) must stay
    // publicly reachable: the manifest link is fetched by Chrome without
    // cookies, and on Android the icon/manifest are fetched server-side by
    // Google's WebAPK minting server. Redirecting them to /login breaks
    // installability, so they are excluded from the auth gate here.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
