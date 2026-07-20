import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { examId, questions } = body;

    const lastQuestion = await prisma.internalQuestion.findFirst({
      where: { examId },
      orderBy: { orderIndex: 'desc' }
    });
    
    let newOrder = lastQuestion ? lastQuestion.orderIndex + 1 : 1;
    let successCount = 0;

    for (const q of questions) {
      await prisma.internalQuestion.create({
        data: {
          examId: examId,
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
    return NextResponse.json({ success: false, error: error.message || 'Failed to bulk upload' }, { status: 500 });
  }
}
