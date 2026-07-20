import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';

export async function middleware(request: NextRequest) {
  const session = await auth();
  const path = request.nextUrl.pathname;

  // Let NextAuth handle its own API routes
  if (path.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Protect all routes EXCEPT /login
  if (!session && path !== '/login') {
    // If it is an API request, return a 401 Unauthorized JSON response
    if (path.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Unauthorized access. Please log in.' }, { status: 401 });
    }
    // If it is a page request, redirect to the login page
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If they ARE logged in but trying to visit the login page, redirect to dashboard
  if (session && path === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// Protect all routes, including API routes, but ignore static files
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
