import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

// POST: Change password
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, error: 'Current and new passwords required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, error: 'New password must be at least 6 characters' }, { status: 400 });
    }

    const userRole = session.user.role;
    const userId = session.user.id;

    // Verify current password and update based on role
    if (userRole === 'STAFF' || userRole === 'ADMIN') {
      // For admin/staff, check against User table
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user || user.password !== currentPassword) {
        return NextResponse.json({ success: false, error: 'Current password is incorrect' }, { status: 400 });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { password: newPassword }
      });
    } else if (userRole === 'STUDENT') {
      // For students, check against Student table
      const student = await prisma.student.findUnique({
        where: { id: userId }
      });

      if (!student || student.password !== currentPassword) {
        return NextResponse.json({ success: false, error: 'Current password is incorrect' }, { status: 400 });
      }

      await prisma.student.update({
        where: { id: userId },
        data: { password: newPassword }
      });
    } else if (userRole === 'PARENT') {
      // For parents, check against Parent table
      const parent = await prisma.parent.findUnique({
        where: { id: userId }
      });

      if (!parent || parent.password !== currentPassword) {
        return NextResponse.json({ success: false, error: 'Current password is incorrect' }, { status: 400 });
      }

      await prisma.parent.update({
        where: { id: userId },
        data: { password: newPassword }
      });
    } else {
      return NextResponse.json({ success: false, error: 'Invalid user role' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ success: false, error: 'Failed to change password' }, { status: 500 });
  }
}
