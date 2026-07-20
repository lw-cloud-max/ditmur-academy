import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const examId = searchParams.get('examId');

    if (!examId) return NextResponse.json({ success: false, error: 'Exam ID required' }, { status: 400 });

    const questions = await prisma.internalQuestion.findMany({
      where: { examId },
      orderBy: { orderIndex: 'asc' }
    });

    return NextResponse.json({ success: true, data: questions });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch questions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { examId, text, imageUrl, optionA, optionB, optionC, optionD, correctAnswer, marks } = body;

    const lastQuestion = await prisma.internalQuestion.findFirst({
      where: { examId },
      orderBy: { orderIndex: 'desc' }
    });
    
    const newOrder = lastQuestion ? lastQuestion.orderIndex + 1 : 1;

    const question = await prisma.internalQuestion.create({
      data: {
        examId,
        text,
        imageUrl: imageUrl || null,
        optionA,
        optionB,
        optionC,
        optionD,
        correctAnswer,
        marks: parseFloat(marks) || 1.0,
        orderIndex: newOrder
      }
    });

    return NextResponse.json({ success: true, data: question }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create question' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, text, imageUrl, optionA, optionB, optionC, optionD, correctAnswer, marks } = body;

    const question = await prisma.internalQuestion.update({
      where: { id },
      data: {
        text, 
        imageUrl: imageUrl || null,
        optionA, optionB, optionC, optionD, correctAnswer,
        marks: parseFloat(marks) || 1.0,
      }
    });

    return NextResponse.json({ success: true, data: question });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update question' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: 'Question ID required' }, { status: 400 });

    await prisma.internalQuestion.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete question' }, { status: 500 });
  }
}
