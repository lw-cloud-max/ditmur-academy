import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subjectId, classId, grades } = body;

    // Default to Term 1 for now (we can make this dynamic later)
    const term = "Term 1 - 2024";

    // Use a transaction to save all student grades at once
    await prisma.$transaction(
      grades.map((gradeData: any) => {
        return prisma.grade.upsert({
          where: {
            studentId_subjectId_term: {
              studentId: gradeData.studentId,
              subjectId: subjectId,
              term: term
            }
          },
          update: {
            ca1: gradeData.ca1,
            ca2: gradeData.ca2,
            exam: gradeData.exam,
            total: gradeData.total,
            letter: gradeData.grade
          },
          create: {
            studentId: gradeData.studentId,
            subjectId: subjectId,
            term: term,
            ca1: gradeData.ca1,
            ca2: gradeData.ca2,
            exam: gradeData.exam,
            total: gradeData.total,
            letter: gradeData.grade
          }
        });
      })
    );

    return NextResponse.json({ success: true, message: "Grades saved successfully!" }, { status: 200 });

  } catch (error) {
    console.error("Failed to save grades:", error);
    return NextResponse.json({ success: false, error: "Failed to save grades." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get('subjectId');
    const classId = searchParams.get('classId');
    const term = "Term 1 - 2024";

    if (!subjectId || !classId) {
      return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 });
    }

    const grades = await prisma.grade.findMany({
      where: {
        subjectId: subjectId,
        term: term,
        student: {
          classId: classId
        }
      }
    });

    return NextResponse.json({ success: true, data: grades });
  } catch (error) {
    console.error("Failed to fetch grades:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch grades." }, { status: 500 });
  }
}
