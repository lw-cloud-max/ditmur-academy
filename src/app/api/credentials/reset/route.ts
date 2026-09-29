import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isSuperAdmin } from '@/lib/permissions';
import { hashPassword, newTemporaryPassword } from '@/lib/passwords';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    if (!isSuperAdmin(await auth())) return NextResponse.json({ success: false, error: 'Super admin required' }, { status: 403 });
    const { kind, id } = await req.json();
    if (!['STUDENT', 'PARENT', 'STAFF'].includes(kind) || typeof id !== 'string' || !id || id.length > 150) {
      return NextResponse.json({ success: false, error: 'Valid account type and ID required' }, { status: 400 });
    }
    const target = kind === 'STUDENT'
      ? await prisma.student.findUnique({ where: { id }, select: { id: true, status: true } })
      : kind === 'PARENT'
        ? await prisma.parent.findUnique({ where: { id }, select: { id: true } })
        : await prisma.staff.findUnique({ where: { id }, select: { id: true, status: true, email: true } });
    if (!target || ('status' in target && target.status !== 'ACTIVE')) {
      return NextResponse.json({ success: false, error: 'Active account not found' }, { status: 404 });
    }
    if (kind === 'STAFF' && 'email' in target && typeof target.email === 'string' && target.email.toLowerCase() === 'admin@ditmur.com') {
      return NextResponse.json({ success: false, error: 'Super admin password is managed in Vercel' }, { status: 400 });
    }
    const temporaryPassword = newTemporaryPassword();
    const hashed = await hashPassword(temporaryPassword);
    if (kind === 'STUDENT') await prisma.student.update({ where: { id }, data: { password: hashed, mustChangePassword: true, sessionVersion: { increment: 1 } } });
    else if (kind === 'PARENT') await prisma.parent.update({ where: { id }, data: { password: hashed, mustChangePassword: true, sessionVersion: { increment: 1 } } });
    else await prisma.staff.update({ where: { id }, data: { passwordHash: hashed, mustChangePassword: true, sessionVersion: { increment: 1 } } });
    return NextResponse.json({ success: true, data: { kind, id, temporaryPassword },
      message: 'Temporary password shown once. Give it to the account holder privately and ask them to change it at first login.'
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Reset credentials error:', error);
    return NextResponse.json({ success: false, error: 'Could not reset login. Try again.' }, { status: 500 });
  }
}
