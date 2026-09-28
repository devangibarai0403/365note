import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decodeSession } from './lib/session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files, api routes, favicon, and login page
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/login'
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('365note_session');

  // If no session cookie, redirect to /login
  if (!sessionCookie?.value) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  const session = decodeSession(sessionCookie.value);
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  const { role } = session;

  // 1. Devangi Route Restrictions
  if (role === 'devangi') {
    // Devangi must not have Office, Excel Import, or Admin Calendar access
    if (
      pathname.startsWith('/office') ||
      pathname.startsWith('/excel-import') ||
      pathname.startsWith('/calendar')
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  // 2. Shrikesh Route Restrictions
  if (role === 'shrikesh') {
    // Shrikesh must not have Classes, School, Excel Import, or Admin Calendar access
    if (
      pathname.startsWith('/classes') ||
      pathname.startsWith('/school') ||
      pathname.startsWith('/excel-import') ||
      pathname.startsWith('/calendar')
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  // Admin has access to everything
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
