import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get('parentId');
    const classId = searchParams.get('classId');

    const whereClause: any = { status: 'ACTIVE' };
    if (parentId) {
      whereClause.parentId = parentId;
    }
    if (classId) {
      whereClause.classId = classId;
    }

    const students = await prisma.student.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
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

// DELETE: Delete a student
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'STAFF')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Student ID required' }, { status: 400 });
    }

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id }
    });

    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    // Delete related records first (in order to avoid foreign key constraints)
    // 1. Delete grades
    await prisma.grade.deleteMany({
      where: { studentId: id }
    });

    // 2. Delete skill ratings
    await prisma.skillRating.deleteMany({
      where: { studentId: id }
    });

    // 3. Delete CBT results
    await prisma.cBTResult.deleteMany({
      where: { studentId: id }
    });

    // 4. Delete internal results
    await prisma.internalResult.deleteMany({
      where: { studentId: id }
    });

    // 5. Delete invoices
    await prisma.invoice.deleteMany({
      where: { studentId: id }
    });

    // 6. Delete attendance records
    await prisma.attendance.deleteMany({
      where: { studentId: id }
    });

    // 7. Delete behavior records
    await prisma.behaviorRecord.deleteMany({
      where: { studentId: id }
    });

    // 8. Delete practice sessions and answers
    const practiceSessions = await prisma.practiceSession.findMany({
      where: { studentId: id },
      select: { id: true }
    });

    for (const session of practiceSessions) {
      await prisma.practiceAnswer.deleteMany({
        where: { sessionId: session.id }
      });
    }

    await prisma.practiceSession.deleteMany({
      where: { studentId: id }
    });

    // 9. Delete portfolio items
    await prisma.portfolio.deleteMany({
      where: { studentId: id }
    });

    // 10. Delete SMS notifications
    await prisma.sMSNotification.deleteMany({
      where: { studentId: id }
    });

    // 11. Finally, delete the student
    await prisma.student.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete student' }, { status: 500 });
  }
}
