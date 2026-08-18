import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) return NextResponse.json({ success: false, error: 'Student ID required' }, { status: 400 });

    const normalizedId = studentId.toUpperCase().trim();

    let student = null;
    try {
      student = await prisma.student.findUnique({
        where: { id: normalizedId },
        include: {
          class: true,
          grades: { include: { subject: true } },
          cbtResults: { include: { exam: true } },
          internalResults: { include: { exam: { include: { subject: true } } } },
          studyResults: { include: { subject: true }, orderBy: { completedAt: 'desc' }, take: 5 }
        }
      });
    } catch (error) {
      console.error("Student dashboard query failed:", error);
      return NextResponse.json({
        success: true,
        data: {
          student: null,
          average: "0.0",
          upcomingExams: [],
          recentStudyResults: []
        }
      });
    }

    if (!student) {
      return NextResponse.json({
        success: true,
        data: {
          student: null,
          average: "0.0",
          upcomingExams: [],
          recentStudyResults: []
        }
      });
    }

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

    const recentStudyResults = student.studyResults || [];

    return NextResponse.json({ 
      success: true, 
      data: {
        student,
        average,
        upcomingExams,
        recentStudyResults
      } 
    });
  } catch (error) {
    console.error("Student Dashboard Fetch Error:", error);
    return NextResponse.json({ success: false, error: "Failed to load dashboard data" }, { status: 500 });
  }
}
