import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { checkPassword, hashPassword, validateNewPassword } from '@/lib/passwords';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    if (session.user.id === 'admin-1' && session.user.role === 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Super admin password is managed in Vercel as SUPER_ADMIN_PASSWORD' }, { status: 400 });
    }
    const { currentPassword, newPassword } = await req.json();
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return NextResponse.json({ success: false, error: 'Current and new passwords required' }, { status: 400 });
    }
    const problem = validateNewPassword(newPassword);
    if (problem || newPassword === currentPassword) {
      return NextResponse.json({ success: false, error: problem || 'Choose a different password' }, { status: 400 });
    }
    const id = session.user.id;
    const role = session.user.role;
    let stored: string | null | undefined;
    if (role === 'STUDENT') {
      const student = await prisma.student.findUnique({ where: { id }, select: { password: true } });
      stored = student?.password;
    } else if (role === 'PARENT') {
      const parent = await prisma.parent.findUnique({ where: { id }, select: { password: true } });
      stored = parent?.password;
    } else if (['ADMIN', 'STAFF', 'ACCOUNTANT'].includes(role)) {
      const staff = await prisma.staff.findUnique({ where: { id }, select: { passwordHash: true, status: true } });
      stored = staff?.status === 'ACTIVE' ? staff.passwordHash : null;
    } else {
      return NextResponse.json({ success: false, error: 'Invalid account' }, { status: 403 });
    }
    if (!stored) return NextResponse.json({ success: false, error: 'Ask the super admin for a temporary password' }, { status: 403 });
    const checked = await checkPassword(stored, currentPassword);
    if (!checked.valid) return NextResponse.json({ success: false,
      error: 'Current password is incorrect. If you used a default password, ask the super admin for a reset.' }, { status: 400 });
    const hashed = await hashPassword(newPassword);
    if (role === 'STUDENT') await prisma.student.update({ where: { id }, data: { password: hashed, mustChangePassword: false, sessionVersion: { increment: 1 } } });
    else if (role === 'PARENT') await prisma.parent.update({ where: { id }, data: { password: hashed, mustChangePassword: false, sessionVersion: { increment: 1 } } });
    else await prisma.staff.update({ where: { id }, data: { passwordHash: hashed, mustChangePassword: false, sessionVersion: { increment: 1 } } });
    return NextResponse.json({ success: true, message: 'Password changed. Sign in again using your new password.' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ success: false, error: 'Failed to change password' }, { status: 500 });
  }
}
