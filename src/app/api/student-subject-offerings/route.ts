import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { isSuperAdmin } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store, max-age=0' };
type SessionActor = { user?: { id?: string; role?: string; staffRole?: string } } | null | undefined;
const isTeachingStaff = (session: SessionActor) =>
  session?.user?.role === 'STAFF' && ['TEACHER', 'ACCOUNTANT_TEACHER'].includes(session.user.staffRole || '');

async function canManageClass(session: SessionActor, classId: string) {
  const schoolClass = await prisma.class.findUnique({ where: { id: classId }, select: { id: true, name: true, teacherId: true } });
  if (!schoolClass) return { schoolClass: null, allowed: false };
  return { schoolClass, allowed: isSuperAdmin(session) || (isTeachingStaff(session) && schoolClass.teacherId === session?.user?.id) };
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !(isSuperAdmin(session) || isTeachingStaff(session))) {
      return NextResponse.json({ success: false, error: 'Assigned class teacher or super admin required' }, { status: 403, headers: noStore });
    }
    const params = new URL(req.url).searchParams;
    const classId = params.get('classId')?.trim() || '';
    const term = params.get('term')?.trim() || '';
    if (!classId || classId.length > 150 || term.length < 3 || term.length > 120) {
      return NextResponse.json({ success: false, error: 'Choose a class and term' }, { status: 400, headers: noStore });
    }
    const access = await canManageClass(session, classId);
    if (!access.schoolClass) return NextResponse.json({ success: false, error: 'Class not found' }, { status: 404, headers: noStore });
    if (!access.allowed) return NextResponse.json({ success: false, error: 'You may manage subjects only for your assigned class' }, { status: 403, headers: noStore });

    const [students, subjects, offeringRows, gradeRows] = await Promise.all([
      prisma.student.findMany({ where: { classId, status: 'ACTIVE' }, select: { id: true, firstName: true, lastName: true }, orderBy: { firstName: 'asc' } }),
      prisma.subject.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.studentSubjectOffering.findMany({ where: { term, student: { classId } }, select: { studentId: true, subjectId: true } }),
      prisma.grade.findMany({ where: { term, student: { classId } }, select: { studentId: true, subjectId: true } })
    ]);
    const explicit = new Map<string, string[]>();
    const suggested = new Map<string, string[]>();
    for (const student of students) { explicit.set(student.id, []); suggested.set(student.id, []); }
    for (const row of offeringRows) explicit.get(row.studentId)?.push(row.subjectId);
    for (const row of gradeRows) suggested.get(row.studentId)?.push(row.subjectId);
    const data = students.map(student => ({
      ...student,
      subjectIds: explicit.get(student.id) || [],
      suggestedSubjectIds: suggested.get(student.id) || []
    }));
    return NextResponse.json({ success: true, data: {
      classInfo: access.schoolClass, term, subjects, students: data,
      configured: offeringRows.length > 0,
      complete: data.length > 0 && data.every(student => student.subjectIds.length > 0)
    } }, { headers: noStore });
  } catch (error) {
    console.error('Fetch subject offerings error:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ success: false, error: 'Could not load subject offerings' }, { status: 500, headers: noStore });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !(isSuperAdmin(session) || isTeachingStaff(session))) {
      return NextResponse.json({ success: false, error: 'Assigned class teacher or super admin required' }, { status: 403, headers: noStore });
    }
    const origin = req.headers.get('origin');
    if (origin && new URL(origin).host !== new URL(req.url).host) {
      return NextResponse.json({ success: false, error: 'Request origin not allowed' }, { status: 403, headers: noStore });
    }
    const raw: unknown = await req.json();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400, headers: noStore });
    const body = raw as Record<string, unknown>;
    const classId = typeof body.classId === 'string' ? body.classId.trim() : '';
    const term = typeof body.term === 'string' ? body.term.trim() : '';
    const offeringInput = body.offerings;
    if (!classId || classId.length > 150 || term.length < 3 || term.length > 120 || body.confirmed !== true ||
        !Array.isArray(offeringInput) || offeringInput.length === 0 || offeringInput.length > 500) {
      return NextResponse.json({ success: false, error: 'Choose a class, term, subjects for every student, and confirm the review' }, { status: 400, headers: noStore });
    }
    const access = await canManageClass(session, classId);
    if (!access.schoolClass) return NextResponse.json({ success: false, error: 'Class not found' }, { status: 404, headers: noStore });
    if (!access.allowed) return NextResponse.json({ success: false, error: 'You may manage subjects only for your assigned class' }, { status: 403, headers: noStore });

    const rows: { studentId: string; subjectIds: string[] }[] = [];
    const seenStudents = new Set<string>();
    for (const item of offeringInput) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return NextResponse.json({ success: false, error: 'Invalid student offering row' }, { status: 400, headers: noStore });
      const row = item as Record<string, unknown>;
      if (typeof row.studentId !== 'string' || !row.studentId || row.studentId.length > 150 ||
          !Array.isArray(row.subjectIds) || row.subjectIds.length === 0 || row.subjectIds.length > 100 ||
          row.subjectIds.some(subjectId => typeof subjectId !== 'string' || !subjectId || subjectId.length > 150)) {
        return NextResponse.json({ success: false, error: 'Every student must have at least one valid offered subject' }, { status: 400, headers: noStore });
      }
      const subjectIds = row.subjectIds as string[];
      if (new Set(subjectIds).size !== subjectIds.length || seenStudents.has(row.studentId)) {
        return NextResponse.json({ success: false, error: 'Duplicate student or subject selection' }, { status: 400, headers: noStore });
      }
      seenStudents.add(row.studentId);
      rows.push({ studentId: row.studentId, subjectIds });
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const currentStudents = await tx.student.findMany({ where: { classId, status: 'ACTIVE' }, select: { id: true } });
      const currentIds = new Set(currentStudents.map(student => student.id));
      if (currentIds.size !== rows.length || rows.some(row => !currentIds.has(row.studentId))) {
        return { ok: false as const, code: 'ROSTER_CHANGED' as const };
      }
      const subjectIds = Array.from(new Set(rows.flatMap(row => row.subjectIds)));
      const subjects = await tx.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true } });
      if (subjects.length !== subjectIds.length) return { ok: false as const, code: 'SUBJECT_MISSING' as const };
      const grades = await tx.grade.findMany({ where: { term, studentId: { in: rows.map(row => row.studentId) } }, select: { studentId: true, subjectId: true } });
      const selected = new Map(rows.map(row => [row.studentId, new Set(row.subjectIds)]));
      const wouldHide = grades.filter(grade => !selected.get(grade.studentId)?.has(grade.subjectId));
      if (wouldHide.length) return { ok: false as const, code: 'GRADED_SUBJECT_REMOVAL' as const, count: wouldHide.length };

      for (const row of rows) {
        for (const selectedSubjectId of row.subjectIds) {
          await tx.studentSubjectOffering.upsert({
            where: { studentId_subjectId_term: { studentId: row.studentId, subjectId: selectedSubjectId, term } },
            create: { studentId: row.studentId, subjectId: selectedSubjectId, term, assignedBy: session.user.id },
            update: { assignedBy: session.user.id }
          });
        }
        await tx.studentSubjectOffering.deleteMany({ where: {
          studentId: row.studentId, term, subjectId: { notIn: row.subjectIds }
        } });
      }
      return { ok: true as const, updated: rows.length };
    }, { isolationLevel: 'Serializable' });

    if (!result.ok) {
      if (result.code === 'ROSTER_CHANGED') return NextResponse.json({ success: false, error: 'Class roster changed while you were editing. Reload and try again; no offerings were saved.' }, { status: 409, headers: noStore });
      if (result.code === 'SUBJECT_MISSING') return NextResponse.json({ success: false, error: 'One or more subjects no longer exist. Reload and try again.' }, { status: 409, headers: noStore });
      return NextResponse.json({ success: false, error: `${result.count} existing grade record(s) would be hidden by removing subjects. No offerings were changed. Review the scores or ask the super admin.` }, { status: 409, headers: noStore });
    }
    return NextResponse.json({ success: true, data: { studentsUpdated: result.updated }, message: 'Subject offerings saved for this class and term.' }, { headers: noStore });
  } catch (error) {
    console.error('Save subject offerings error:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ success: false, error: 'Could not save subject offerings. Nothing was confirmed; reload and check before retrying.' }, { status: 500, headers: noStore });
  }
}
