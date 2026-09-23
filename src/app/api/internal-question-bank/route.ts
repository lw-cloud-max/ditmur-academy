import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

// GET: Fetch questions from internal question bank
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get('subjectId');
    const classId = searchParams.get('classId');
    const topic = searchParams.get('topic');
    const difficulty = searchParams.get('difficulty');

    const whereClause: any = { isActive: true };
    if (subjectId) whereClause.subjectId = subjectId;
    if (classId) whereClause.classId = classId;
    if (topic) whereClause.topic = { contains: topic, mode: 'insensitive' };
    if (difficulty) whereClause.difficulty = difficulty;

    const questions = await prisma.internalQuestionBank.findMany({
      where: whereClause,
      include: {
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: questions });
  } catch (error) {
    console.error('Fetch internal question bank error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch questions' }, { status: 500 });
  }
}

// POST: Add question to internal question bank
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'STAFF')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { subjectId, classId, text, imageUrl, optionA, optionB, optionC, optionD, correctAnswer, explanation, topic, difficulty } = await req.json();

    if (!subjectId || !text || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const question = await prisma.internalQuestionBank.create({
      data: {
        subjectId,
        classId: classId || null,
        text,
        imageUrl,
        optionA,
        optionB,
        optionC,
        optionD,
        correctAnswer: correctAnswer.toUpperCase(),
        explanation,
        topic,
        difficulty: difficulty || 'MEDIUM'
      },
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } }
      }
    });

    return NextResponse.json({ success: true, data: question }, { status: 201 });
  } catch (error) {
    console.error('Add internal question error:', error);
    return NextResponse.json({ success: false, error: 'Failed to add question' }, { status: 500 });
  }
}

// PUT: Bulk import questions
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'STAFF')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { questions } = await req.json();

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json({ success: false, error: 'Questions array required' }, { status: 400 });
    }

    const result = await prisma.internalQuestionBank.createMany({
      data: questions.map((q: any) => ({
        subjectId: q.subjectId,
        classId: q.classId || null,
        text: q.text,
        imageUrl: q.imageUrl,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswer: (q.correctAnswer || 'A').toUpperCase(),
        explanation: q.explanation,
        topic: q.topic,
        difficulty: q.difficulty || 'MEDIUM'
      })),
      skipDuplicates: true
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Bulk import internal questions error:', error);
    return NextResponse.json({ success: false, error: 'Failed to import questions' }, { status: 500 });
  }
}

// PATCH: Update question
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'STAFF')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id, ...updateData } = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'Question ID required' }, { status: 400 });
    }

    if (updateData.correctAnswer) {
      updateData.correctAnswer = updateData.correctAnswer.toUpperCase();
    }

    const question = await prisma.internalQuestionBank.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true, data: question });
  } catch (error) {
    console.error('Update internal question error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update question' }, { status: 500 });
  }
}

// DELETE: Delete question(s)
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Question ID required' }, { status: 400 });
    }

    await prisma.internalQuestionBank.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Question deleted' });
  } catch (error) {
    console.error('Delete internal question error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete question' }, { status: 500 });
  }
}
