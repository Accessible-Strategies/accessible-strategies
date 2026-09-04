import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Combined proxy: admin-auth gate + coming-soon gate.
 *
 * Next.js 16 renamed middleware.ts -> proxy.ts, and only one is allowed,
 * so both concerns live in this single function now.
 *
 * 1. Admin auth (unchanged from before): "/admin/login" is always allowed
 *    through; any other "/admin/*" route requires a valid NextAuth token,
 *    redirecting to the login page otherwise.
 * 2. Coming-soon gate (new): while the public site isn't launched yet,
 *    every route that ISN'T "/", "/admin/*", "/api/*", or a standard
 *    static/root file redirects back to "/" (the splash page). Remove
 *    this block once the real site is ready to launch.
 */
const ALLOWED_EXACT = new Set([
  '/',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.json',
]);

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

  if (ALLOWED_EXACT.has(pathname)) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = '/';
  return NextResponse.redirect(url);
}

// Runs on every route except Next.js's own static/image asset paths -
// admin, api, and coming-soon exemptions are all handled inside the
// function above rather than the matcher, since matcher patterns can't
// express "these exact files" as cleanly as a Set check can.
export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};