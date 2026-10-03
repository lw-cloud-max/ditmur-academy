import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';
const LEGACY_TERM = 'Term 1 - 2024';
const getTerm = (value: string | null | undefined) => (value || LEGACY_TERM).trim();
const allowedStaff = (role?: string) => role === 'STAFF' || role === 'ADMIN';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !allowedStaff(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Teachers and admins only' }, { status: 403 });
    }
    const body = await req.json();
    const { subjectId, classId, grades } = body;
    const term = getTerm(body.term);
    if (typeof subjectId !== 'string' || !subjectId || typeof classId !== 'string' || !classId ||
        typeof body.term !== 'string' || term.length < 3 || term.length > 120 ||
        !Array.isArray(grades) || !grades.length || grades.length > 500) {
      return NextResponse.json({ success: false, error: 'Subject, class, term and grades are required' }, { status: 400 });
    }
    const normalized = grades.map((item: unknown) => {
      if (!item || typeof item !== 'object') return null;
      const grade = item as Record<string, unknown>;
      const ca1 = Number(grade.ca1), ca2 = Number(grade.ca2), exam = Number(grade.exam);
      if (typeof grade.studentId !== 'string' || !grade.studentId ||
          !Number.isFinite(ca1) || ca1 < 0 || ca1 > 20 ||
          !Number.isFinite(ca2) || ca2 < 0 || ca2 > 20 ||
          !Number.isFinite(exam) || exam < 0 || exam > 60) return null;
      const total = ca1 + ca2 + exam;
      const letter = total >= 75 ? 'A' : total >= 65 ? 'B' : total >= 55 ? 'C' : total >= 45 ? 'D' : total >= 40 ? 'E' : 'F';
      return { studentId: grade.studentId, ca1, ca2, exam, total, letter };
    });
    if (normalized.some(item => item === null)) return NextResponse.json({ success: false, error: 'Scores must be within CA1 0-20, CA2 0-20, Exam 0-60' }, { status: 400 });
    const entries = normalized as NonNullable<(typeof normalized)[number]>[];
    const ids = entries.map(item => item.studentId);
    if (new Set(ids).size !== ids.length) return NextResponse.json({ success: false, error: 'Duplicate student IDs' }, { status: 400 });
    const [subject, schoolClass, studentCount] = await Promise.all([
      prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true } }),
      prisma.class.findUnique({ where: { id: classId }, select: { id: true } }),
      prisma.student.count({ where: { classId, id: { in: ids }, status: 'ACTIVE' } })
    ]);
    if (!subject || !schoolClass || studentCount !== ids.length) {
      return NextResponse.json({ success: false, error: 'Subject, class or student list does not match school records' }, { status: 400 });
    }
    // Any saved change returns the class-term to DRAFT in the same transaction.
    // No newly edited mark remains public under an old approval.
    await prisma.$transaction(async tx => {
      for (const entry of entries) {
        const key = { studentId: entry.studentId, subjectId, term };
        await tx.grade.upsert({ where: { studentId_subjectId_term: key },
          update: { ca1: entry.ca1, ca2: entry.ca2, exam: entry.exam, total: entry.total, letter: entry.letter },
          create: { ...key, ca1: entry.ca1, ca2: entry.ca2, exam: entry.exam, total: entry.total, letter: entry.letter }
        });
      }
      await tx.reportRelease.upsert({ where: { classId_term: { classId, term } },
        update: { approvedAt: null, approvedBy: null }, create: { classId, term } });
    });
    return NextResponse.json({ success: true, message: 'Grades saved as draft. Super-admin approval is needed to publish.' });
  } catch (error) {
    console.error('Save grades error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save grades' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !allowedStaff(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Draft grades are staff-only' }, { status: 403 });
    }
    const params = new URL(req.url).searchParams;
    const subjectId = params.get('subjectId'), classId = params.get('classId');
    const term = getTerm(params.get('term'));
    if (!subjectId || !classId || term.length < 3 || term.length > 120) {
      return NextResponse.json({ success: false, error: 'Subject, class and term required' }, { status: 400 });
    }
    const grades = await prisma.grade.findMany({ where: { subjectId, term, student: { classId } } });
    return NextResponse.json({ success: true, data: grades });
  } catch (error) {
    console.error('Fetch grades error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch grades' }, { status: 500 });
  }
}
