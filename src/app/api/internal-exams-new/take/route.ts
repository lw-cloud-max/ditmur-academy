import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

// POST: Start an exam attempt
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ success: false, error: 'Only students can take exams' }, { status: 401 });
    }

    const { examId } = await req.json();

    if (!examId) {
      return NextResponse.json({ success: false, error: 'Exam ID required' }, { status: 400 });
    }

    // Check if exam exists and is active
    const exam = await prisma.internalExamNew.findUnique({
      where: { id: examId },
      include: { questions: true }
    });

    if (!exam) {
      return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 404 });
    }

    if (!exam.isActive) {
      return NextResponse.json({ success: false, error: 'Exam is not active' }, { status: 400 });
    }

    // Check if student already attempted
    const existingAttempt = await prisma.internalExamAttempt.findUnique({
      where: { examId_studentId: { examId, studentId: session.user.id } }
    });

    if (existingAttempt) {
      return NextResponse.json({ success: false, error: 'You have already attempted this exam' }, { status: 400 });
    }

    // Create attempt
    const attempt = await prisma.internalExamAttempt.create({
      data: {
        examId,
        studentId: session.user.id
      }
    });

    // Return questions without correct answers
    const questions = exam.questions.map(q => ({
      id: q.id,
      questionNumber: q.orderIndex,
      text: q.text,
      imageUrl: q.imageUrl,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      marks: q.marks
    }));

    return NextResponse.json({
      success: true,
      data: {
        attemptId: attempt.id,
        exam: {
          id: exam.id,
          title: exam.title,
          durationMinutes: exam.durationMinutes,
          totalMarks: exam.totalMarks
        },
        questions
      }
    });
  } catch (error) {
    console.error('Start exam attempt error:', error);
    return NextResponse.json({ success: false, error: 'Failed to start exam' }, { status: 500 });
  }
}

// PUT: Submit exam answers
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ success: false, error: 'Only students can submit exams' }, { status: 401 });
    }

    const { attemptId, answers } = await req.json();

    if (!attemptId || !answers) {
      return NextResponse.json({ success: false, error: 'Attempt ID and answers required' }, { status: 400 });
    }

    // Verify attempt belongs to student
    const attempt = await prisma.internalExamAttempt.findUnique({
      where: { id: attemptId },
      include: { exam: { include: { questions: true } } }
    });

    if (!attempt || attempt.studentId !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Attempt not found' }, { status: 404 });
    }

    if (attempt.submittedAt) {
      return NextResponse.json({ success: false, error: 'Exam already submitted' }, { status: 400 });
    }

    // Calculate score
    let score = 0;
    const answersToSave = [];

    for (const answer of answers) {
      const question = attempt.exam.questions.find(q => q.id === answer.questionId);
      if (!question) continue;

      const isCorrect = question.correctAnswer === answer.selectedAnswer?.toUpperCase();
      const marksObtained = isCorrect ? question.marks : 0;
      score += marksObtained;

      answersToSave.push({
        attemptId,
        questionId: answer.questionId,
        selectedAnswer: answer.selectedAnswer?.toUpperCase() || null,
        isCorrect,
        marksObtained
      });
    }

    // Save answers
    await prisma.internalExamAnswer.createMany({
      data: answersToSave
    });

    // Update attempt with results
    const totalMarks = attempt.exam.totalMarks;
    const isPassed = score >= attempt.exam.passingMarks;

    await prisma.internalExamAttempt.update({
      where: { id: attemptId },
      data: {
        submittedAt: new Date(),
        score,
        totalMarks,
        isPassed
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        score,
        totalMarks,
        percentage: Math.round((score / totalMarks) * 100),
        isPassed,
        passingMarks: attempt.exam.passingMarks
      }
    });
  } catch (error) {
    console.error('Submit exam error:', error);
    return NextResponse.json({ success: false, error: 'Failed to submit exam' }, { status: 500 });
  }
}

// GET: Get exam results
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const attemptId = searchParams.get('attemptId');
    const examId = searchParams.get('examId');

    if (attemptId) {
      // Get specific attempt results
      const attempt = await prisma.internalExamAttempt.findUnique({
        where: { id: attemptId },
        include: {
          exam: { include: { questions: true } },
          answers: true
        }
      });

      if (!attempt) {
        return NextResponse.json({ success: false, error: 'Attempt not found' }, { status: 404 });
      }

      // Check if user is authorized to view
      const isStudent = session.user.role === 'STUDENT' && attempt.studentId === session.user.id;
      const isStaff = session.user.role === 'ADMIN' || session.user.role === 'STAFF';

      if (!isStudent && !isStaff) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
      }

      // Build results with explanations
      const results = attempt.exam.questions.map(question => {
        const answer = attempt.answers.find(a => a.questionId === question.id);
        return {
          questionId: question.id,
          questionNumber: question.orderIndex,
          questionText: question.text,
          options: {
            A: question.optionA,
            B: question.optionB,
            C: question.optionC,
            D: question.optionD
          },
          correctAnswer: question.correctAnswer,
          selectedAnswer: answer?.selectedAnswer || null,
          isCorrect: answer?.isCorrect || false,
          marksObtained: answer?.marksObtained || 0,
          explanation: question.explanation
        };
      });

      return NextResponse.json({
        success: true,
        data: {
          attempt: {
            id: attempt.id,
            examId: attempt.examId,
            examTitle: attempt.exam.title,
            studentId: attempt.studentId,
            startedAt: attempt.startedAt,
            submittedAt: attempt.submittedAt,
            score: attempt.score,
            totalMarks: attempt.totalMarks,
            isPassed: attempt.isPassed
          },
          results
        }
      });
    }

    if (examId) {
      // Get all attempts for an exam (admin/teacher view)
      if (session.user.role !== 'ADMIN' && session.user.role !== 'STAFF') {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
      }

      const attempts = await prisma.internalExamAttempt.findMany({
        where: { examId },
        include: {
          student: { select: { id: true, firstName: true, lastName: true, class: { select: { name: true } } } }
        },
        orderBy: { score: 'desc' }
      });

      return NextResponse.json({ success: true, data: attempts });
    }

    // Get student's own attempts
    const attempts = await prisma.internalExamAttempt.findMany({
      where: { studentId: session.user.id },
      include: {
        exam: { select: { id: true, title: true, subject: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: attempts });
  } catch (error) {
    console.error('Get exam results error:', error);
    return NextResponse.json({ success: false, error: 'Failed to get results' }, { status: 500 });
  }
}
