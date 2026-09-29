import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) return NextResponse.json({ success: false, error: 'Student ID required' }, { status: 400 });

    const normalizedId = studentId.toUpperCase().trim();
    const session = await auth();
    if (!session?.user || session.user.role !== 'STUDENT' || session.user.id !== normalizedId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const student = await prisma.student.findUnique({
      where: { id: normalizedId },
      select: {
        id: true, firstName: true, lastName: true, imageUrl: true, classId: true,
        class: { select: { id: true, name: true } },
        grades: { include: { subject: true } },
        cbtResults: { include: { exam: true } },
        internalResults: { include: { exam: { include: { subject: true } } } }
      }
    });
    if (!student) return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });

    let totalScore = 0;
    let totalSubjects = 0;
    student.grades.forEach((g: any) => {
      totalScore += (g.total || 0);
      totalSubjects++;
    });
    const average = totalSubjects > 0 ? (totalScore / totalSubjects).toFixed(1) : "0.0";

    let upcomingExams: any[] = [];
    try {
      upcomingExams = await prisma.internalExam.findMany({
        where: { 
          classId: student.classId || undefined,
          isActive: true
        },
        include: { subject: true }
      });
    } catch (e) {
      console.error("Prisma error ignored for exams:", e);
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        student,
        average,
        upcomingExams
      } 
    });
  } catch (error) {
    console.error("Student Dashboard Fetch Error:", error);
    return NextResponse.json({ success: false, error: "Failed to load dashboard data" }, { status: 500 });
  }
}
