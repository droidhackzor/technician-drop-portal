import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('cdp_session')?.value;
  const { pathname } = request.nextUrl;

  const protectedPaths = ['/dashboard'];
  const authPaths = ['/login'];

  if (protectedPaths.some((path) => pathname.startsWith(path)) && !session) {
    const url = new URL('/login', request.url);
    return NextResponse.redirect(url);
  }

  if (authPaths.some((path) => pathname.startsWith(path)) && session) {
    const url = new URL('/dashboard', request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
