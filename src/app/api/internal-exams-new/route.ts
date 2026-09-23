import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

// GET: Fetch internal exams
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const subjectId = searchParams.get('subjectId');
    const classId = searchParams.get('classId');

    const whereClause: any = {};
    if (status) whereClause.status = status;
    if (subjectId) whereClause.subjectId = subjectId;
    if (classId) whereClause.classId = classId;

    // If student, only show exams for their class
    if (session.user.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { id: session.user.id },
        select: { classId: true }
      });
      if (student?.classId) {
        whereClause.classId = student.classId;
        whereClause.isActive = true;
      }
    }

    const exams = await prisma.internalExamNew.findMany({
      where: whereClause,
      include: {
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { questions: true, attempts: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: exams });
  } catch (error) {
    console.error('Fetch internal exams error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch exams' }, { status: 500 });
  }
}

// POST: Create new internal exam
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'STAFF')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description, subjectId, classId, durationMinutes, totalMarks, passingMarks, startTime, endTime, shuffleQuestions, showResults, questionIds } = await req.json();

    if (!title || !subjectId || !questionIds || questionIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Title, subject, and questions required' }, { status: 400 });
    }

    // Fetch questions from bank
    const questions = await prisma.internalQuestionBank.findMany({
      where: { id: { in: questionIds } }
    });

    if (questions.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid questions found' }, { status: 400 });
    }

    // Create exam with questions
    const exam = await prisma.internalExamNew.create({
      data: {
        title,
        description,
        subjectId,
        classId: classId || null,
        durationMinutes: durationMinutes || 60,
        totalMarks: totalMarks || questions.length,
        passingMarks: passingMarks || Math.floor(questions.length * 0.4),
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        shuffleQuestions: shuffleQuestions || false,
        showResults: showResults || false,
        createdBy: session.user.id,
        questions: {
          create: questions.map((q, index) => ({
            questionBankId: q.id,
            text: q.text,
            imageUrl: q.imageUrl,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            marks: 1,
            orderIndex: index + 1
          }))
        }
      },
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } },
        questions: true
      }
    });

    return NextResponse.json({ success: true, data: exam }, { status: 201 });
  } catch (error) {
    console.error('Create internal exam error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create exam' }, { status: 500 });
  }
}

// PATCH: Update exam status
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'STAFF')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id, isActive, showResults } = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'Exam ID required' }, { status: 400 });
    }

    const updateData: any = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (showResults !== undefined) updateData.showResults = showResults;

    const exam = await prisma.internalExamNew.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true, data: exam });
  } catch (error) {
    console.error('Update internal exam error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update exam' }, { status: 500 });
  }
}

// DELETE: Delete exam
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Exam ID required' }, { status: 400 });
    }

    // Delete related records first
    await prisma.internalExamAnswer.deleteMany({
      where: { attempt: { examId: id } }
    });
    await prisma.internalExamAttempt.deleteMany({
      where: { examId: id }
    });
    await prisma.internalExamNewQuestion.deleteMany({
      where: { examId: id }
    });

    // Delete the exam
    await prisma.internalExamNew.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Exam deleted' });
  } catch (error) {
    console.error('Delete internal exam error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete exam' }, { status: 500 });
  }
}
