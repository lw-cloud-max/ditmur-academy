import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get('subjectId');
    const classId = searchParams.get('classId');

    const where: any = {};
    if (subjectId) where.subjectId = subjectId;
    if (classId) where.classId = classId;

    const questions = await prisma.questionBank.findMany({
      where,
      include: { subject: true, class: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: questions });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch question bank' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subjectId, classId, text, imageUrl, optionA, optionB, optionC, optionD, correctAnswer, marks } = body;

    const question = await prisma.questionBank.create({
      data: {
        subjectId,
        classId: classId || null,
        text: String(text),
        imageUrl: imageUrl || null,
        optionA: String(optionA),
        optionB: String(optionB),
        optionC: String(optionC),
        optionD: String(optionD),
        correctAnswer: String(correctAnswer).substring(0, 1).toUpperCase(),
        marks: parseFloat(marks) || 1.0,
      }
    });

    return NextResponse.json({ success: true, data: question }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create question in bank' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, text, imageUrl, optionA, optionB, optionC, optionD, correctAnswer, marks } = body;

    const question = await prisma.questionBank.update({
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
    return NextResponse.json({ success: false, error: 'Failed to update question in bank' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

    await prisma.questionBank.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete question' }, { status: 500 });
  }
}
