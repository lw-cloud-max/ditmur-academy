import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

// GET: Fetch questions from internal question bank
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'STAFF')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
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

    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: 'Invalid question update' }, { status: 400 });
    }
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!id) return NextResponse.json({ success: false, error: 'Question ID required' }, { status: 400 });

    // GET includes subject/class relations and timestamps. Never pass those
    // objects back into Prisma's update data; accept editable fields only.
    const data: {
      text?: string; optionA?: string; optionB?: string; optionC?: string; optionD?: string;
      correctAnswer?: string; explanation?: string | null; topic?: string | null; difficulty?: string;
    } = {};
    for (const field of ['text', 'optionA', 'optionB', 'optionC', 'optionD'] as const) {
      if (body[field] === undefined) continue;
      if (typeof body[field] !== 'string' || !body[field].trim()) {
        return NextResponse.json({ success: false, error: `${field} cannot be empty` }, { status: 400 });
      }
      data[field] = body[field].trim();
    }
    if (body.correctAnswer !== undefined) {
      const answer = typeof body.correctAnswer === 'string' ? body.correctAnswer.trim().toUpperCase() : '';
      if (!/^[ABCD]$/.test(answer)) return NextResponse.json({ success: false, error: 'Answer must be A, B, C or D' }, { status: 400 });
      data.correctAnswer = answer;
    }
    for (const field of ['explanation', 'topic'] as const) {
      if (body[field] === undefined) continue;
      if (body[field] !== null && typeof body[field] !== 'string') {
        return NextResponse.json({ success: false, error: `${field} must be text` }, { status: 400 });
      }
      data[field] = typeof body[field] === 'string' ? body[field].trim() || null : null;
    }
    if (body.difficulty !== undefined) {
      if (!['EASY', 'MEDIUM', 'HARD'].includes(body.difficulty)) {
        return NextResponse.json({ success: false, error: 'Invalid difficulty' }, { status: 400 });
      }
      data.difficulty = body.difficulty;
    }
    if (!Object.keys(data).length) return NextResponse.json({ success: false, error: 'No editable changes supplied' }, { status: 400 });

    const question = await prisma.internalQuestionBank.update({ where: { id }, data });

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
