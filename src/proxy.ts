import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith('/api/auth')) return NextResponse.next();
  const session = await auth();
  const publicRoutes = ['/', '/login', '/apply', '/api/apply', '/programs/creche', '/programs/primary', '/programs/secondary', '/terms', '/privacy'];
  const isPublic = publicRoutes.some(route => path === route || path.startsWith(route + '/'));
  if (!session?.user) {
    if (isPublic) return NextResponse.next();
    if (path.startsWith('/api/')) return NextResponse.json({ success: false, error: 'Please sign in' }, { status: 401 });
    return NextResponse.redirect(new URL('/login', request.url));
  }
  const { id, role } = session.user;
  const superAdmin = role === 'ADMIN' && id === 'admin-1';
  const deny = () => path.startsWith('/api/')
    ? NextResponse.json({ success: false, error: 'Account or role no longer active' }, { status: 403 })
    : NextResponse.redirect(new URL('/access-denied', request.url));
  if (['STAFF', 'ADMIN', 'ACCOUNTANT'].includes(role) && !superAdmin) {
    const staff = await prisma.staff.findUnique({ where: { id }, select: { status: true, role: true, sessionVersion: true } });
    const roleMatches = (role === 'ACCOUNTANT' && staff?.role === 'ACCOUNTANT') ||
      (role === 'ADMIN' && staff?.role === 'ADMIN') ||
      (role === 'STAFF' && (
        (staff?.role === 'ACCOUNTANT_TEACHER' && session.user.staffRole === 'ACCOUNTANT_TEACHER') ||
        (['TEACHER', 'SUPPORT'].includes(staff?.role || '') && (!session.user.staffRole || session.user.staffRole === staff?.role))
      ));
    if (path !== '/access-denied' && (!staff || staff.status !== 'ACTIVE' || !roleMatches || staff.sessionVersion !== session.user.sessionVersion)) return deny();
  }
  if (role === 'STUDENT' || role === 'PARENT') {
    const account = role === 'STUDENT'
      ? await prisma.student.findUnique({ where: { id }, select: { status: true, sessionVersion: true } })
      : await prisma.parent.findUnique({ where: { id }, select: { sessionVersion: true } });
    if (path !== '/access-denied' && (!account || ('status' in account && account.status !== 'ACTIVE') || account.sessionVersion !== session.user.sessionVersion)) return deny();
  }
  if (!superAdmin && session.user.mustChangePassword !== false) {
    if (path === '/change-password' || path === '/access-denied' || path === '/api/change-password') return NextResponse.next();
    if (path.startsWith('/api/')) return NextResponse.json({ success: false, error: 'Change your temporary password before continuing' }, { status: 403 });
    return NextResponse.redirect(new URL('/change-password', request.url));
  }
  if (role === 'ACCOUNTANT') {
    const allowedPage = ['/dashboard', '/payments', '/change-password', '/help', '/access-denied'].some(route => path === route);
    const allowedApi = path === '/api/dashboard' || path === '/api/payments' || path.startsWith('/api/payments/') ||
      path === '/api/change-password' || (path === '/api/students' && request.method === 'GET');
    if (path.startsWith('/api/') ? !allowedApi : !allowedPage) return deny();
  }
  if (path === '/' || path === '/login' || path === '/apply') return NextResponse.redirect(new URL('/dashboard', request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
};
