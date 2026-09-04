import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Coming-soon gate. While the public site is still being built, every
 * route EXCEPT the ones below redirects to "/" (the splash page).
 *
 * Left reachable on purpose:
 *  - "/"                — the splash page itself (don't redirect to itself)
 *  - "/admin/*"          — the admin panel, which has its own login/auth
 *  - "/api/*"            — server endpoints, including the scheduler cron
 *                          route, which must keep working even though the
 *                          public site isn't launched yet
 *  - "/_next/*"          — Next.js build assets (JS/CSS chunks, images)
 *  - common static/root files (favicon, robots.txt, sitemap.xml, manifest)
 *
 * Remove or narrow this middleware once the real site is ready to launch.
 */
const ALLOWED_PREFIXES = ['/admin', '/api', '/_next'];
const ALLOWED_EXACT = new Set([
  '/',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.json',
]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (ALLOWED_EXACT.has(pathname)) return NextResponse.next();
  if (ALLOWED_PREFIXES.some(prefix => pathname.startsWith(prefix))) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/';
  return NextResponse.redirect(url);
}

// Skip the middleware for anything under /_next or with a file extension
// (images, fonts, etc.) as a perf/safety net on top of the checks above.
export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};