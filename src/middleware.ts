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

  // Define public routes
  const isPublicRoute = path === '/' || path.startsWith('/apply') || path.startsWith('/api/apply') || path === '/login';

  // Protect all non-public routes
  if (!session && !isPublicRoute) {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Unauthorized access. Please log in.' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect logged-in users away from public marketing/auth pages to the dashboard
  if (session && (path === '/' || path === '/login' || path === '/apply')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Protect all routes, including API routes, but ignore static files
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
