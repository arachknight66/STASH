import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE, verifyToken } from './lib/auth';

const publicRoutes = [
  '/login',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/oauth/google',
  '/api/auth/oauth/microsoft',
  '/api/auth/oauth/callback',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicRoutes.includes(pathname) || pathname.startsWith('/_next/') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;

  if (pathname === '/') {
    if (token) {
      const userId = await verifyToken(token);
      if (userId) return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next(); // Let them see the public landing page
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const userId = await verifyToken(token);
  if (!userId) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete(AUTH_COOKIE);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
