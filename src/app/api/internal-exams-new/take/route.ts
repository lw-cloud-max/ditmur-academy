import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

// POST: Start (or resume) a student's exam, never return correct answers.
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ success: false, error: 'Only students can take exams' }, { status: 401 });
    }
    const { examId } = await req.json();
    if (typeof examId !== 'string' || !examId) {
      return NextResponse.json({ success: false, error: 'Exam ID required' }, { status: 400 });
    }
    const [student, exam] = await Promise.all([
      prisma.student.findUnique({ where: { id: session.user.id }, select: { classId: true } }),
      prisma.internalExamNew.findUnique({ where: { id: examId }, include: { questions: { orderBy: { orderIndex: 'asc' } } } })
    ]);
    if (!student) return NextResponse.json({ success: false, error: 'Student record not found' }, { status: 404 });
    if (!exam) return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 404 });
    if (exam.classId && exam.classId !== student.classId) {
      return NextResponse.json({ success: false, error: 'This exam is not assigned to your class' }, { status: 403 });
    }
    if (!exam.isActive || exam.questions.length === 0) {
      return NextResponse.json({ success: false, error: 'Exam is not available' }, { status: 403 });
    }
    const now = new Date();
    if ((exam.startTime && exam.startTime > now) || (exam.endTime && exam.endTime < now)) {
      return NextResponse.json({ success: false, error: 'Exam is outside its scheduled time' }, { status: 403 });
    }

    let attempt = await prisma.internalExamAttempt.findUnique({
      where: { examId_studentId: { examId, studentId: session.user.id } }
    });
    if (attempt?.submittedAt) {
      return NextResponse.json({ success: false, error: 'You have already submitted this exam' }, { status: 409 });
    }
    if (!attempt) {
      // A double click can race the unique constraint; return the existing attempt.
      try {
        attempt = await prisma.internalExamAttempt.create({
          data: { examId, studentId: session.user.id }
        });
      } catch (error) {
        attempt = await prisma.internalExamAttempt.findUnique({
          where: { examId_studentId: { examId, studentId: session.user.id } }
        });
        if (!attempt) throw error;
        if (attempt.submittedAt) {
          return NextResponse.json({ success: false, error: 'You have already submitted this exam' }, { status: 409 });
        }
      }
    }
    const questions = exam.questions.map(q => ({
      id: q.id, questionNumber: q.orderIndex, text: q.text, imageUrl: q.imageUrl,
      optionA: q.optionA, optionB: q.optionB, optionC: q.optionC, optionD: q.optionD, marks: q.marks
    }));
    if (exam.shuffleQuestions) {
      // Stable for this attempt across reloads; the server grades by question ID.
      const hash = (text: string) => [...text].reduce((n, char) => (n * 31 + char.charCodeAt(0)) | 0, 7);
      questions.sort((a, b) => hash(attempt.id + a.id) - hash(attempt.id + b.id));
    }
    return NextResponse.json({ success: true, data: {
      attemptId: attempt.id, startedAt: attempt.startedAt,
      exam: { id: exam.id, title: exam.title, durationMinutes: exam.durationMinutes,
        totalMarks: exam.totalMarks, showResults: exam.showResults }, questions
    } });
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

    if (!Array.isArray(answers) || answers.some(a =>
      !a || typeof a.questionId !== 'string' ||
      (a.selectedAnswer != null && !['A', 'B', 'C', 'D'].includes(a.selectedAnswer)))) {
      return NextResponse.json({ success: false, error: 'Invalid answers' }, { status: 400 });
    }
    const selected = new Map<string, string>();
    for (const answer of answers) {
      if (selected.has(answer.questionId)) {
        return NextResponse.json({ success: false, error: 'Duplicate answer' }, { status: 400 });
      }
      selected.set(answer.questionId, answer.selectedAnswer);
    }
    if ([...selected.keys()].some(id => !attempt.exam.questions.some(q => q.id === id))) {
      return NextResponse.json({ success: false, error: 'Unknown question' }, { status: 400 });
    }
    const rawScore = attempt.exam.questions.reduce((sum, q) =>
      sum + (selected.get(q.id) === q.correctAnswer ? q.marks : 0), 0);
    const rawTotal = attempt.exam.questions.reduce((sum, q) => sum + q.marks, 0);
    // Older exams stored one mark/question while advertising 100 total marks.
    const totalMarks = attempt.exam.totalMarks;
    const score = rawTotal ? Math.round(rawScore / rawTotal * totalMarks * 100) / 100 : 0;
    const isPassed = score >= attempt.exam.passingMarks;
    // Both the attempt status and answers commit together (or not at all).
    const saved = await prisma.$transaction(async tx => {
      const claimed = await tx.internalExamAttempt.updateMany({
        where: { id: attemptId, submittedAt: null },
        data: { submittedAt: new Date(), score, totalMarks, isPassed }
      });
      if (claimed.count !== 1) return false;
      await tx.internalExamAnswer.createMany({
        data: attempt.exam.questions.map(q => ({
          attemptId, questionId: q.id, selectedAnswer: selected.get(q.id) || null,
          isCorrect: selected.get(q.id) === q.correctAnswer,
          marksObtained: selected.get(q.id) === q.correctAnswer ? q.marks : 0
        }))
      });
      return true;
    });
    if (!saved) return NextResponse.json({ success: false, error: 'Exam already submitted' }, { status: 409 });
    return NextResponse.json({ success: true, data: attempt.exam.showResults
      ? { score, totalMarks, isPassed, passingMarks: attempt.exam.passingMarks }
      : { submitted: true } });
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

      if (!attempt.submittedAt || (isStudent && !attempt.exam.showResults)) {
        return NextResponse.json({ success: false, error: 'Results are not available yet' }, { status: 403 });
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

    if (session.user.role !== 'STUDENT') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    // Get student's own attempts. Hide scores until the teacher releases results.
    const attempts = await prisma.internalExamAttempt.findMany({
      where: { studentId: session.user.id },
      include: {
        exam: { select: { id: true, title: true, showResults: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: attempts.map(a => ({
      id: a.id, examId: a.examId, submittedAt: a.submittedAt,
      score: a.submittedAt && a.exam.showResults ? a.score : null,
      totalMarks: a.submittedAt && a.exam.showResults ? a.totalMarks : null,
      isPassed: a.submittedAt && a.exam.showResults ? a.isPassed : null
    })) });
  } catch (error) {
    console.error('Get exam results error:', error);
    return NextResponse.json({ success: false, error: 'Failed to get results' }, { status: 500 });
  }
}
