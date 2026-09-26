import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

// Staff see every exam; students see only published exams for their class.
// The detail response is staff-only and explicitly loads questions/attempts.
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const isStaff = session.user.role === 'ADMIN' || session.user.role === 'STAFF';
    const isStudent = session.user.role === 'STUDENT';
    if (!isStaff && !isStudent) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if (id) {
      if (!isStaff) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      const exam = await prisma.internalExamNew.findUnique({
        where: { id },
        include: {
          subject: { select: { id: true, name: true } },
          class: { select: { id: true, name: true } },
          creator: { select: { firstName: true, lastName: true } },
          questions: { orderBy: { orderIndex: 'asc' } },
          attempts: { select: { id: true, studentId: true, score: true, submittedAt: true } }
        }
      });
      if (!exam) return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 404 });
      return NextResponse.json({ success: true, data: exam });
    }

    const whereClause: any = {};
    if (isStudent) {
      const student = await prisma.student.findUnique({
        where: { id: session.user.id }, select: { classId: true }
      });
      if (!student) return NextResponse.json({ success: false, error: 'Student record not found' }, { status: 404 });
      whereClause.isActive = true;
      whereClause.OR = student.classId ? [{ classId: null }, { classId: student.classId }] : [{ classId: null }];
    } else {
      const classId = searchParams.get('classId');
      if (classId) whereClause.classId = classId;
      const isActive = searchParams.get('isActive');
      if (isActive === 'true' || isActive === 'false') whereClause.isActive = isActive === 'true';
    }

    const exams = await prisma.internalExamNew.findMany({
      where: whereClause,
      include: {
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        creator: { select: { firstName: true, lastName: true } },
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

    const body = await req.json();
    const { title, description, subjectId, classId, durationMinutes, totalMarks, passingMarks, startTime, endTime, shuffleQuestions, showResults, isActive, questionIds } = body;

    console.log('Creating exam:', { title, subjectId, questionIds: questionIds?.length });

    if (!title?.trim() || !subjectId || !Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Title, subject, and at least one question required' }, { status: 400 });
    }

    const duration = Number(durationMinutes);
    const marks = Number(totalMarks);
    const pass = Number(passingMarks);
    if (!Number.isInteger(duration) || duration < 5 || duration > 300 ||
        !Number.isInteger(marks) || marks < questionIds.length ||
        !Number.isInteger(pass) || pass < 0 || pass > marks ||
        (startTime && Number.isNaN(Date.parse(startTime))) ||
        (endTime && Number.isNaN(Date.parse(endTime))) ||
        (startTime && endTime && new Date(startTime) >= new Date(endTime))) {
      return NextResponse.json({ success: false, error: 'Check exam duration, marks, passing marks and schedule' }, { status: 400 });
    }
    if (new Set(questionIds).size !== questionIds.length) {
      return NextResponse.json({ success: false, error: 'Duplicate questions selected' }, { status: 400 });
    }

    // Find or create a staff record for the current user
    let staffId = session.user.id;
    
    // Check if staff exists
    const existingStaff = await prisma.staff.findUnique({
      where: { id: staffId }
    });

    if (!existingStaff) {
      // If admin user, find any admin staff or create one
      if (session.user.role === 'ADMIN') {
        const adminStaff = await prisma.staff.findFirst({
          where: { role: 'ADMIN' }
        });
        
        if (adminStaff) {
          staffId = adminStaff.id;
        } else {
          // Create a default admin staff
          const newStaff = await prisma.staff.create({
            data: {
              id: 'admin-staff',
              firstName: 'System',
              lastName: 'Admin',
              email: 'admin@ditmur.com',
              phone: '0000000000',
              role: 'ADMIN',
              status: 'ACTIVE'
            }
          });
          staffId = newStaff.id;
        }
      } else {
        return NextResponse.json({ success: false, error: 'Staff record not found. Please contact admin.' }, { status: 400 });
      }
    }

    // Fetch questions from bank
    const questions = await prisma.internalQuestionBank.findMany({
      where: { id: { in: questionIds }, subjectId, isActive: true }
    });

    if (questions.length !== questionIds.length ||
        (classId && questions.some(q => q.classId && q.classId !== classId))) {
      return NextResponse.json({ success: false, error: 'Some questions are not available for this subject or class' }, { status: 400 });
    }
    // Preserve the teacher's selected order and distribute marks exactly.
    const questionById = new Map(questions.map(q => [q.id, q]));

    console.log('Found', questions.length, 'questions in bank');

    // Create exam with questions
    const exam = await prisma.internalExamNew.create({
      data: {
        title: title.trim(),
        isActive: isActive === true,
        description: description || null,
        subjectId,
        classId: classId || null,
        durationMinutes: duration,
        totalMarks: marks,
        passingMarks: pass,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        shuffleQuestions: shuffleQuestions || false,
        showResults: showResults || false,
        createdBy: staffId,
        questions: {
          create: questionIds.map((questionId: string, index: number) => {
            const q = questionById.get(questionId)!;
            return {
            questionBankId: q.id,
            text: q.text,
            imageUrl: q.imageUrl || null,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || null,
            marks: Math.floor(marks / questionIds.length) + (index < marks % questionIds.length ? 1 : 0),
            orderIndex: index + 1
          };
          })
        }
      },
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } },
        questions: true
      }
    });

    console.log('Exam created successfully:', exam.id);

    return NextResponse.json({ success: true, data: exam }, { status: 201 });
  } catch (error: any) {
    console.error('Create internal exam error:', error);
    return NextResponse.json({ 
      success: false, 
      error: `Failed to create exam: ${error.message}` 
    }, { status: 500 });
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