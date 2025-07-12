// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Root redirect to explore page only if user is logged in
  if (pathname === '/') {
    // Check for authentication cookie or token
    const authCookie = request.cookies.get('auth-storage');
    const sessionCookie = request.cookies.get('session');
    
    // If user is authenticated, redirect to explore
    if (authCookie || sessionCookie) {
      return NextResponse.redirect(new URL('/explore', request.url));
    }
    
    // If not authenticated, allow access to home page
    return NextResponse.next();
  }

  // Initialize project data on first visit to explore page
  if (pathname === '/explore') {
    const response = NextResponse.next();
    response.headers.set('x-init-required', 'true');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
