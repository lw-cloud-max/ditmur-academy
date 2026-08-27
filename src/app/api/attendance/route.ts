import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

// POST: Save attendance records
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'STAFF')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { attendance, date } = await req.json();

    if (!attendance || !Array.isArray(attendance) || attendance.length === 0) {
      return NextResponse.json({ success: false, error: 'No attendance data provided' }, { status: 400 });
    }

    const attendanceDate = new Date(date);

    // Delete existing attendance for this date and class first
    const classId = attendance[0]?.classId;
    if (classId) {
      await prisma.attendance.deleteMany({
        where: {
          classId: classId,
          date: attendanceDate
        }
      });
    }

    // Create new attendance records
    const results = await Promise.all(
      attendance.map(async (record: { studentId: string; status: string; classId: string }) => {
        return prisma.attendance.create({
          data: {
            studentId: record.studentId,
            classId: record.classId,
            date: attendanceDate,
            status: record.status,
            markedBy: session.user.id
          }
        });
      })
    );

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error('Save attendance error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save attendance' }, { status: 500 });
  }
}

// GET: Fetch attendance records
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    const date = searchParams.get('date');
    const studentId = searchParams.get('studentId');

    const whereClause: any = {};
    if (classId) whereClause.classId = classId;
    if (date) whereClause.date = new Date(date);
    if (studentId) whereClause.studentId = studentId;

    const attendance = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        class: { select: { id: true, name: true } }
      },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json({ success: true, data: attendance });
  } catch (error) {
    console.error('Fetch attendance error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch attendance' }, { status: 500 });
  }
}
