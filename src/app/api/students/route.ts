import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get('parentId');
    const classId = searchParams.get('classId');

    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const role = session.user.role;
    const whereClause: any = { status: 'ACTIVE' };
    if (role === 'PARENT') whereClause.parentId = session.user.id;
    else if (role === 'STUDENT') whereClause.id = session.user.id;
    else if (!['ADMIN', 'STAFF', 'ACCOUNTANT'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    if (parentId && !whereClause.parentId) whereClause.parentId = parentId;
    if (classId) whereClause.classId = classId;

    const students = await prisma.student.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        otherNames: true,
        dob: true,
        gender: true,
        status: true,
        classId: true,
        parentId: true,
        imageUrl: true,
        badges: true,
        class: {
          select: {
            id: true,
            name: true
          }
        },
        parent: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: { firstName: 'asc' }
    });

    return NextResponse.json({ success: true, data: students });
  } catch (error) {
    console.error('Fetch students error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch students' }, { status: 500 });
  }
}

// Destructive deletion used to erase invoices, grades, attendance, results
// and other school records. Departure is a status change, not a deletion.
export async function DELETE() {
  return NextResponse.json({ success: false, error: 'Permanent Student deletion is disabled. Use Mark Inactive instead.' }, { status: 405 });
}
