import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

// Default questions database - will be supplemented by database questions
const DEFAULT_QUESTIONS_DB: Record<string, Record<string, any[]>> = {
  'JAMB': {
    'Mathematics': [
      {
        id: 'jamb-math-1',
        questionNumber: 1,
        text: 'If 2x + 5 = 15, what is the value of x?',
        optionA: '3',
        optionB: '5',
        optionC: '7',
        optionD: '10',
        correctAnswer: 'B',
        explanation: '2x + 5 = 15\n2x = 15 - 5\n2x = 10\nx = 10/2\nx = 5',
        topic: 'Algebra',
        difficulty: 'EASY'
      },
      {
        id: 'jamb-math-2',
        questionNumber: 2,
        text: 'What is the area of a circle with radius 7cm? (Take π = 22/7)',
        optionA: '154 cm²',
        optionB: '148 cm²',
        optionC: '144 cm²',
        optionD: '140 cm²',
        correctAnswer: 'A',
        explanation: 'Area = πr²\n= (22/7) × 7²\n= (22/7) × 49\n= 22 × 7\n= 154 cm²',
        topic: 'Geometry',
        difficulty: 'EASY'
      },
      {
        id: 'jamb-math-3',
        questionNumber: 3,
        text: 'Simplify: (3/4 + 1/3) × 12',
        optionA: '13',
        optionB: '12',
        optionC: '11',
        optionD: '10',
        correctAnswer: 'A',
        explanation: '3/4 + 1/3 = 9/12 + 4/12 = 13/12\n(13/12) × 12 = 13',
        topic: 'Fractions',
        difficulty: 'MEDIUM'
      },
      {
        id: 'jamb-math-4',
        questionNumber: 4,
        text: 'If the sum of angles in a triangle is 180°, what is the third angle if two angles are 45° and 65°?',
        optionA: '60°',
        optionB: '70°',
        optionC: '80°',
        optionD: '90°',
        correctAnswer: 'B',
        explanation: 'Sum of angles = 180°\n45° + 65° + x = 180°\n110° + x = 180°\nx = 180° - 110°\nx = 70°',
        topic: 'Geometry',
        difficulty: 'EASY'
      },
      {
        id: 'jamb-math-5',
        questionNumber: 5,
        text: 'What is 15% of 200?',
        optionA: '25',
        optionB: '30',
        optionC: '35',
        optionD: '40',
        correctAnswer: 'B',
        explanation: '15% of 200 = (15/100) × 200 = 0.15 × 200 = 30',
        topic: 'Percentage',
        difficulty: 'EASY'
      }
    ],
    'English Language': [
      {
        id: 'jamb-eng-1',
        questionNumber: 1,
        text: 'Choose the word that is opposite in meaning to "generous":',
        optionA: 'Kind',
        optionB: 'Stingy',
        optionC: 'Wealthy',
        optionD: 'Happy',
        correctAnswer: 'B',
        explanation: 'Generous means willing to give freely. Stingy means unwilling to give or spend.',
        topic: 'Vocabulary',
        difficulty: 'EASY'
      },
      {
        id: 'jamb-eng-2',
        questionNumber: 2,
        text: 'Identify the part of speech of the underlined word: She sang beautifully.',
        optionA: 'Noun',
        optionB: 'Verb',
        optionC: 'Adverb',
        optionD: 'Adjective',
        correctAnswer: 'C',
        explanation: 'Beautifully describes how she sang, so it is an adverb.',
        topic: 'Parts of Speech',
        difficulty: 'EASY'
      },
      {
        id: 'jamb-eng-3',
        questionNumber: 3,
        text: 'Choose the correct spelling:',
        optionA: 'Accomodation',
        optionB: 'Accommodation',
        optionC: 'Acomodation',
        optionD: 'Acommodation',
        correctAnswer: 'B',
        explanation: 'The correct spelling is "accommodation" with double c and double m.',
        topic: 'Spelling',
        difficulty: 'EASY'
      }
    ],
    'Physics': [
      {
        id: 'jamb-phy-1',
        questionNumber: 1,
        text: 'What is the SI unit of force?',
        optionA: 'Joule',
        optionB: 'Newton',
        optionC: 'Watt',
        optionD: 'Pascal',
        correctAnswer: 'B',
        explanation: 'The SI unit of force is Newton (N), named after Sir Isaac Newton.',
        topic: 'Units',
        difficulty: 'EASY'
      },
      {
        id: 'jamb-phy-2',
        questionNumber: 2,
        text: 'Which of the following is a vector quantity?',
        optionA: 'Speed',
        optionB: 'Distance',
        optionC: 'Velocity',
        optionD: 'Mass',
        correctAnswer: 'C',
        explanation: 'Velocity has both magnitude and direction, making it a vector quantity.',
        topic: 'Vectors',
        difficulty: 'EASY'
      }
    ],
    'Chemistry': [
      {
        id: 'jamb-chem-1',
        questionNumber: 1,
        text: 'What is the chemical symbol for Gold?',
        optionA: 'Go',
        optionB: 'Gd',
        optionC: 'Au',
        optionD: 'Ag',
        correctAnswer: 'C',
        explanation: 'The chemical symbol for Gold is Au, from the Latin word "Aurum".',
        topic: 'Chemical Symbols',
        difficulty: 'EASY'
      }
    ],
    'Biology': [
      {
        id: 'jamb-bio-1',
        questionNumber: 1,
        text: 'What is the powerhouse of the cell?',
        optionA: 'Nucleus',
        optionB: 'Mitochondria',
        optionC: 'Ribosome',
        optionD: 'Cell membrane',
        correctAnswer: 'B',
        explanation: 'Mitochondria are known as the powerhouse of the cell because they produce energy (ATP).',
        topic: 'Cell Biology',
        difficulty: 'EASY'
      }
    ]
  },
  'WAEC': {
    'Mathematics': [
      {
        id: 'waec-math-1',
        questionNumber: 1,
        text: 'Factorize: x² - 9',
        optionA: '(x + 3)(x - 3)',
        optionB: '(x + 3)(x + 3)',
        optionC: '(x - 3)(x - 3)',
        optionD: 'x(x - 9)',
        correctAnswer: 'A',
        explanation: 'x² - 9 is a difference of two squares.\na² - b² = (a + b)(a - b)\nx² - 9 = x² - 3² = (x + 3)(x - 3)',
        topic: 'Factorization',
        difficulty: 'EASY'
      },
      {
        id: 'waec-math-2',
        questionNumber: 2,
        text: 'Solve: 3x - 7 = 14',
        optionA: 'x = 5',
        optionB: 'x = 6',
        optionC: 'x = 7',
        optionD: 'x = 8',
        correctAnswer: 'C',
        explanation: '3x - 7 = 14\n3x = 14 + 7\n3x = 21\nx = 21/3\nx = 7',
        topic: 'Algebra',
        difficulty: 'EASY'
      }
    ],
    'English Language': [
      {
        id: 'waec-eng-1',
        questionNumber: 1,
        text: 'Choose the correct option: "The book is ___ the table."',
        optionA: 'in',
        optionB: 'on',
        optionC: 'at',
        optionD: 'by',
        correctAnswer: 'B',
        explanation: 'We use "on" for surfaces. The book is on the table.',
        topic: 'Prepositions',
        difficulty: 'EASY'
      }
    ]
  },
  'NECO': {
    'Mathematics': [
      {
        id: 'neco-math-1',
        questionNumber: 1,
        text: 'What is 15% of 200?',
        optionA: '25',
        optionB: '30',
        optionC: '35',
        optionD: '40',
        correctAnswer: 'B',
        explanation: '15% of 200 = (15/100) × 200 = 0.15 × 200 = 30',
        topic: 'Percentage',
        difficulty: 'EASY'
      },
      {
        id: 'neco-math-2',
        questionNumber: 2,
        text: 'If a rectangle has length 8cm and width 5cm, what is its perimeter?',
        optionA: '24 cm',
        optionB: '26 cm',
        optionC: '28 cm',
        optionD: '30 cm',
        correctAnswer: 'B',
        explanation: 'Perimeter = 2(length + width)\n= 2(8 + 5)\n= 2(13)\n= 26 cm',
        topic: 'Mensuration',
        difficulty: 'EASY'
      }
    ],
    'English Language': [
      {
        id: 'neco-eng-1',
        questionNumber: 1,
        text: 'Choose the word that best completes the sentence: "She ___ to school every day."',
        optionA: 'go',
        optionB: 'goes',
        optionC: 'going',
        optionD: 'gone',
        correctAnswer: 'B',
        explanation: 'For third person singular (she/he/it) in simple present tense, we add "s" to the verb. She goes to school every day.',
        topic: 'Grammar',
        difficulty: 'EASY'
      }
    ]
  }
};

// POST: Start a new practice session
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { examType, subject, numberOfQuestions } = await req.json();

    console.log('Practice request:', { examType, subject, numberOfQuestions, userId: session.user.id });

    if (!examType || !subject) {
      return NextResponse.json({ success: false, error: 'Exam type and subject required' }, { status: 400 });
    }

    // Get questions from default database
    const examQuestions = DEFAULT_QUESTIONS_DB[examType]?.[subject] || [];
    
    console.log('Available questions:', examQuestions.length);
    
    if (examQuestions.length === 0) {
      console.log('No questions found for:', examType, subject);
      console.log('Available exam types:', Object.keys(DEFAULT_QUESTIONS_DB));
      console.log('Available subjects for', examType + ':', Object.keys(DEFAULT_QUESTIONS_DB[examType] || {}));
      
      return NextResponse.json({ 
        success: false, 
        error: `No questions available for ${examType} ${subject}. Please try another subject or exam type.` 
      }, { status: 404 });
    }

    // Limit questions
    const questions = examQuestions.slice(0, numberOfQuestions || 20);

    // Create practice session (studentId is optional now)
    const practiceSession = await prisma.practiceSession.create({
      data: {
        studentId: session.user.id,
        examType,
        subject,
        totalQuestions: questions.length,
        correctAnswers: 0,
        score: 0,
        timeTaken: 0,
        completed: false
      }
    });

    console.log('Practice session created:', practiceSession.id);

    // Return questions WITHOUT correct answers and explanations
    const questionsForPractice = questions.map(q => ({
      id: q.id,
      questionNumber: q.questionNumber,
      text: q.text,
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

    if (!practiceSession) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    // Check if user owns this session (studentId might be null)
    if (practiceSession.studentId && practiceSession.studentId !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    if (practiceSession.completed) {
      return NextResponse.json({ success: false, error: 'Session already completed' }, { status: 400 });
    }

    // Get questions from default database to check answers
    const examQuestions = DEFAULT_QUESTIONS_DB[practiceSession.examType]?.[practiceSession.subject] || [];
    const questionMap = new Map(examQuestions.map(q => [q.id, q]));

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
        questionNumber: question.questionNumber,
        questionText: question.text,
        optionA: question.optionA,
        optionB: question.optionB,
        optionC: question.optionC,
        optionD: question.optionD,
        correctAnswer: question.correctAnswer,
        selectedAnswer: answer.selectedAnswer?.toUpperCase() || null,
        isCorrect,
        explanation: question.explanation,
        topic: question.topic,
        timeTaken: answer.timeTaken || 0
      });
    }

    // Save all answers
    await prisma.practiceAnswer.createMany({
      data: practiceAnswers
    });

    // Update session
    const score = (correctCount / practiceSession.totalQuestions) * 100;
    await prisma.practiceSession.update({
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
          answers: true
        }
      });

      if (!practiceSession) {
        return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
      }

      // Format results with explanations
      const results = practiceSession.answers.map(answer => ({
        questionId: answer.id,
        questionText: answer.questionText,
        questionNumber: answer.questionNumber,
        options: {
          A: answer.optionA,
          B: answer.optionB,
          C: answer.optionC,
          D: answer.optionD
        },
        selectedAnswer: answer.selectedAnswer,
        correctAnswer: answer.correctAnswer,
        isCorrect: answer.isCorrect,
        explanation: answer.explanation,
        topic: answer.topic
      }));

      return NextResponse.json({ 
        success: true, 
        data: {
          session: {
            id: practiceSession.id,
            examType: practiceSession.examType,
            subject: practiceSession.subject,
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

// GET: Fetch available subjects for an exam type
export async function OPTIONS(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const examType = searchParams.get('examType');

    if (!examType) {
      // Return all exam types and their subjects
      const allSubjects: Record<string, string[]> = {};
      for (const [type, subjects] of Object.entries(DEFAULT_QUESTIONS_DB)) {
        allSubjects[type] = Object.keys(subjects);
      }
      return NextResponse.json({ success: true, data: allSubjects });
    }

    // Return subjects for specific exam type
    const subjects = Object.keys(DEFAULT_QUESTIONS_DB[examType] || {});
    return NextResponse.json({ success: true, data: subjects });
  } catch (error) {
    console.error('Fetch subjects error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch subjects' }, { status: 500 });
  }
}
