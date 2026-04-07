import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret'
);

async function hasValidSession(request: NextRequest) {
  const token = request.cookies.get('session')?.value;
  if (!token) return false;

  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isLoginPage = pathname === '/login';
  const isDashboard = pathname.startsWith('/dashboard');
  const isApi = pathname.startsWith('/api');
  const isStatic =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public');

  if (isApi || isStatic) {
    return NextResponse.next();
  }

  const loggedIn = await hasValidSession(request);

  if (isDashboard && !loggedIn) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname + search);
    return NextResponse.redirect(url);
  }

  if (isLoginPage && loggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
