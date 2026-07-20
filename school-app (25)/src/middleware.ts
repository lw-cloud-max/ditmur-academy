import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';

export async function middleware(request: NextRequest) {
  const session = await auth();
  
  // The path the user is trying to visit
  const path = request.nextUrl.pathname;

  // Protect all routes EXCEPT /login
  if (!session && path !== '/login') {
    // If they aren't logged in and trying to access the app, kick them to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If they ARE logged in but trying to visit the login page, redirect to dashboard
  if (session && path === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// Specify which routes this middleware should protect
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
