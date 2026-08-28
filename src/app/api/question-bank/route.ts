import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

// GET: Fetch questions from question bank
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const examType = searchParams.get('examType');
    const subject = searchParams.get('subject');
    const year = searchParams.get('year');
    const isActive = searchParams.get('isActive');
    const limit = searchParams.get('limit');

    const whereClause: any = {};
    if (examType) whereClause.examType = examType;
    if (subject) whereClause.subject = subject;
    if (year) whereClause.year = parseInt(year);
    if (isActive !== null) whereClause.isActive = isActive === 'true';

    const questions = await prisma.examQuestionBank.findMany({
      where: whereClause,
      orderBy: [
        { examType: 'asc' },
        { subject: 'asc' },
        { year: 'desc' },
        { questionNumber: 'asc' }
      ],
      take: limit ? parseInt(limit) : undefined
    });

    // Get available filters
    const examTypes = await prisma.examQuestionBank.findMany({
      select: { examType: true },
      distinct: ['examType']
    });

    const subjects = await prisma.examQuestionBank.findMany({
      where: examType ? { examType } : {},
      select: { subject: true },
      distinct: ['subject'],
      orderBy: { subject: 'asc' }
    });

    const years = await prisma.examQuestionBank.findMany({
      where: {
        ...(examType ? { examType } : {}),
        ...(subject ? { subject } : {}),
        year: { not: null }
      },
      select: { year: true },
      distinct: ['year'],
      orderBy: { year: 'desc' }
    });

    return NextResponse.json({ 
      success: true, 
      data: questions,
      filters: {
        examTypes: examTypes.map(e => e.examType),
        subjects: subjects.map(s => s.subject),
        years: years.map(y => y.year).filter(Boolean)
      },
      total: questions.length
    });
  } catch (error) {
    console.error('Fetch question bank error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch questions' }, { status: 500 });
  }
}

// POST: Add question to question bank
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'STAFF')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { examType, subject, year, questionNumber, text, imageUrl, optionA, optionB, optionC, optionD, correctAnswer, explanation, topic, difficulty } = await req.json();

    if (!examType || !subject || !questionNumber || !text || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const question = await prisma.examQuestionBank.create({
      data: {
        examType,
        subject,
        year: year ? parseInt(year) : null,
        questionNumber: parseInt(questionNumber),
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
      }
    });

    return NextResponse.json({ success: true, data: question }, { status: 201 });
  } catch (error) {
    console.error('Add question error:', error);
    return NextResponse.json({ success: false, error: 'Failed to add question' }, { status: 500 });
  }
}

// PUT: Bulk import questions
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { questions } = await req.json();

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json({ success: false, error: 'Questions array required' }, { status: 400 });
    }

    const result = await prisma.examQuestionBank.createMany({
      data: questions.map((q: any) => ({
        examType: q.examType,
        subject: q.subject,
        year: q.year ? parseInt(q.year) : null,
        questionNumber: parseInt(q.questionNumber),
        text: q.text,
        imageUrl: q.imageUrl,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswer: q.correctAnswer.toUpperCase(),
        explanation: q.explanation,
        topic: q.topic,
        difficulty: q.difficulty || 'MEDIUM'
      })),
      skipDuplicates: true
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Bulk import error:', error);
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

    const question = await prisma.examQuestionBank.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true, data: question });
  } catch (error) {
    console.error('Update question error:', error);
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
    const deleteAll = searchParams.get('deleteAll');
    const examType = searchParams.get('examType');
    const subject = searchParams.get('subject');

    if (deleteAll === 'true' && examType && subject) {
      // Delete all questions for a specific exam type and subject
      const result = await prisma.examQuestionBank.deleteMany({
        where: { examType, subject }
      });
      return NextResponse.json({ success: true, message: `Deleted ${result.count} questions` });
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Question ID required' }, { status: 400 });
    }

    await prisma.examQuestionBank.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Question deleted' });
  } catch (error) {
    console.error('Delete question error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete question' }, { status: 500 });
  }
}
