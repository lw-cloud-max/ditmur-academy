import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentId, examId, answers } = body;

    // Fetch the exam questions to calculate the score
    const questions = await prisma.examQuestion.findMany({
      where: { examId }
    });

    let score = 0;
    let totalMarks = 0;

    questions.forEach(q => {
      totalMarks += q.marks;
      if (answers[q.id] === q.correctAnswer) {
        score += q.marks;
      }
    });

    // Save the result to the database
    const result = await prisma.cBTResult.upsert({
      where: {
        studentId_examId: {
          studentId,
          examId
        }
      },
      update: {
        score,
        totalMarks,
        submittedAt: new Date()
      },
      create: {
        studentId,
        examId,
        score,
        totalMarks
      }
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    console.error("CBT Submit Error:", error);
    return NextResponse.json({ success: false, error: 'Failed to submit exam.' }, { status: 500 });
  }
}
