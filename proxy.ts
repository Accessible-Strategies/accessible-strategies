import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Combined proxy: admin-auth gate + coming-soon gate.
 *
 * Next.js 16 renamed middleware.ts -> proxy.ts, and only one is allowed,
 * so both concerns live in this single function now.
 *
 * 1. Admin auth (unchanged from the original file): "/admin/login" is
 *    always allowed through; any other "/admin/*" route requires a valid
 *    NextAuth token, redirecting to the login page otherwise.
 * 2. Coming-soon gate: while the public site isn't launched yet, every
 *    route that ISN'T "/", "/admin/*", "/api/*", or a static file (image,
 *    icon, css, etc. served from /public) redirects back to "/" (the
 *    splash page). Remove this block once the real site is ready to
 *    launch.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- Admin auth ---
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin')) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const loginUrl = new URL('/admin/login', req.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // --- Coming-soon gate ---
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Let any static file in /public through (logo, favicon, images, etc.)
  // rather than trying to allowlist every filename individually.
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) {
    return NextResponse.next();
  }

  if (pathname === '/') {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = '/';
  return NextResponse.redirect(url);
}

// Runs on every route except Next.js's own static/image asset paths -
// admin, api, static-file, and coming-soon exemptions are all handled
// inside the function above rather than the matcher, since matcher
// patterns can't express file-extension checks as cleanly as a regex can.
export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};