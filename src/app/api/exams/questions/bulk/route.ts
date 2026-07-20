import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { examId, questions, section } = body;

    // We do a loop manually without transactions to ensure absolute stability in SQLite
    // and to catch exactly which property is failing if there's a schema mismatch.
    
    const lastQuestion = await prisma.examQuestion.findFirst({
      where: { examId },
      orderBy: { orderIndex: 'desc' }
    });
    
    let newOrder = lastQuestion ? lastQuestion.orderIndex + 1 : 1;

    let successCount = 0;

    for (const q of questions) {
      await prisma.examQuestion.create({
        data: {
          examId: examId,
          section: section || 'English Studies',
          text: String(q.text),
          optionA: String(q.optionA),
          optionB: String(q.optionB),
          optionC: String(q.optionC),
          optionD: String(q.optionD),
          correctAnswer: String(q.correctAnswer).substring(0, 1).toUpperCase(),
          marks: parseFloat(q.marks) || 1.0,
          orderIndex: newOrder++
        }
      });
      successCount++;
    }

    return NextResponse.json({ success: true, message: `Added ${successCount} questions` }, { status: 201 });
  } catch (error: any) {
    console.error("Bulk Upload Error Detail:", error.message || error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to bulk upload questions.' }, { status: 500 });
  }
}
