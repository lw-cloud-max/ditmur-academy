import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

// POST: Start a new practice session
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { examType, subject, year, numberOfQuestions } = await req.json();

    if (!examType || !subject) {
      return NextResponse.json({ success: false, error: 'Exam type and subject required' }, { status: 400 });
    }

    // Build query for questions
    const whereClause: any = { examType, subject };
    if (year) whereClause.year = parseInt(year);

    // Get questions
    const questions = await prisma.pastQuestion.findMany({
      where: whereClause,
      orderBy: { questionNumber: 'asc' },
      take: numberOfQuestions ? parseInt(numberOfQuestions) : 50
    });

    if (questions.length === 0) {
      return NextResponse.json({ success: false, error: 'No questions found for this selection' }, { status: 404 });
    }

    // Create practice session
    const practiceSession = await prisma.practiceSession.create({
      data: {
        studentId: session.user.id,
        examType,
        subject,
        year: year ? parseInt(year) : null,
        totalQuestions: questions.length,
        correctAnswers: 0,
        score: 0,
        timeTaken: 0,
        completed: false
      }
    });

    // Return questions WITHOUT correct answers and explanations
    const questionsForPractice = questions.map(q => ({
      id: q.id,
      questionNumber: q.questionNumber,
      text: q.text,
      imageUrl: q.imageUrl,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      topic: q.topic,
      difficulty: q.difficulty
      // Note: correctAnswer and explanation are NOT included
    }));

    return NextResponse.json({ 
      success: true, 
      data: {
        sessionId: practiceSession.id,
        questions: questionsForPractice,
        totalQuestions: questions.length
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Start practice error:', error);
    return NextResponse.json({ success: false, error: 'Failed to start practice' }, { status: 500 });
  }
}

// PUT: Submit practice answers
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, answers, timeTaken } = await req.json();

    if (!sessionId || !answers) {
      return NextResponse.json({ success: false, error: 'Session ID and answers required' }, { status: 400 });
    }

    // Verify session belongs to user
    const practiceSession = await prisma.practiceSession.findUnique({
      where: { id: sessionId }
    });

    if (!practiceSession || practiceSession.studentId !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    if (practiceSession.completed) {
      return NextResponse.json({ success: false, error: 'Session already completed' }, { status: 400 });
    }

    // Get correct answers
    const questionIds = answers.map((a: any) => a.questionId);
    const questions = await prisma.pastQuestion.findMany({
      where: { id: { in: questionIds } }
    });

    const questionMap = new Map(questions.map(q => [q.id, q]));

    // Calculate score and save answers
    let correctCount = 0;
    const practiceAnswers = [];

    for (const answer of answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) continue;

      const isCorrect = question.correctAnswer === answer.selectedAnswer?.toUpperCase();
      if (isCorrect) correctCount++;

      practiceAnswers.push({
        sessionId,
        questionId: answer.questionId,
        selectedAnswer: answer.selectedAnswer?.toUpperCase() || null,
        isCorrect,
        timeTaken: answer.timeTaken || 0
      });
    }

    // Save all answers
    await prisma.practiceAnswer.createMany({
      data: practiceAnswers
    });

    // Update session
    const score = (correctCount / practiceSession.totalQuestions) * 100;
    const updatedSession = await prisma.practiceSession.update({
      where: { id: sessionId },
      data: {
        correctAnswers: correctCount,
        score,
        timeTaken: timeTaken || 0,
        completed: true
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: {
        sessionId,
        totalQuestions: practiceSession.totalQuestions,
        correctAnswers: correctCount,
        score: Math.round(score * 100) / 100,
        timeTaken
      }
    });
  } catch (error) {
    console.error('Submit practice error:', error);
    return NextResponse.json({ success: false, error: 'Failed to submit practice' }, { status: 500 });
  }
}

// GET: Fetch practice results with explanations
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const studentId = searchParams.get('studentId');

    if (sessionId) {
      // Get specific session results with explanations
      const practiceSession = await prisma.practiceSession.findUnique({
        where: { id: sessionId },
        include: {
          answers: {
            include: {
              question: true
            }
          }
        }
      });

      if (!practiceSession) {
        return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
      }

      // Format results with explanations
      const results = practiceSession.answers.map(answer => ({
        questionId: answer.questionId,
        questionText: answer.question.text,
        questionNumber: answer.question.questionNumber,
        options: {
          A: answer.question.optionA,
          B: answer.question.optionB,
          C: answer.question.optionC,
          D: answer.question.optionD
        },
        selectedAnswer: answer.selectedAnswer,
        correctAnswer: answer.question.correctAnswer,
        isCorrect: answer.isCorrect,
        explanation: answer.question.explanation,
        topic: answer.question.topic
      }));

      return NextResponse.json({ 
        success: true, 
        data: {
          session: {
            id: practiceSession.id,
            examType: practiceSession.examType,
            subject: practiceSession.subject,
            year: practiceSession.year,
            totalQuestions: practiceSession.totalQuestions,
            correctAnswers: practiceSession.correctAnswers,
            score: practiceSession.score,
            timeTaken: practiceSession.timeTaken,
            completed: practiceSession.completed,
            createdAt: practiceSession.createdAt
          },
          results
        }
      });
    }

    // Get all sessions for student
    const targetStudentId = studentId || session.user.id;
    const sessions = await prisma.practiceSession.findMany({
      where: { studentId: targetStudentId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return NextResponse.json({ success: true, data: sessions });
  } catch (error) {
    console.error('Fetch practice results error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch results' }, { status: 500 });
  }
}
