import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';
const LEGACY_TERM = 'Term 1 - 2024';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    const term = (searchParams.get('term') || LEGACY_TERM).trim();
    if (!classId || term.length < 3 || term.length > 120) {
      return NextResponse.json({ success: false, error: 'Class and term required' }, { status: 400 });
    }
    const role = session.user.role;
    const isStaff = role === 'STAFF' || role === 'ADMIN';
    if (!isStaff && role !== 'STUDENT' && role !== 'PARENT') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    if (role === 'STUDENT') {
      const assigned = await prisma.student.findUnique({ where: { id: session.user.id }, select: { classId: true } });
      if (!assigned || assigned.classId !== classId) return NextResponse.json({ success: false, error: 'Report not available for this class' }, { status: 403 });
    }
    if (role === 'PARENT') {
      const child = await prisma.student.findFirst({ where: { classId, parentId: session.user.id, status: 'ACTIVE' }, select: { id: true } });
      if (!child) return NextResponse.json({ success: false, error: 'Report not available for this family' }, { status: 403 });
    }
    const release = await prisma.reportRelease.findUnique({ where: { classId_term: { classId, term } }, select: { approvedAt: true } });
    if (!isStaff && !release?.approvedAt) {
      return NextResponse.json({ success: false, error: 'Results for this class and term are awaiting approval' }, { status: 403 });
    }
    const studentFilter = { classId, status: 'ACTIVE', ...(role === 'STUDENT' ? { id: session.user.id } : {}),
      ...(role === 'PARENT' ? { parentId: session.user.id } : {}) };
    const [classInfo, allSubjects, students, offeringRows] = await Promise.all([
      prisma.class.findUnique({ where: { id: classId }, select: { id: true, name: true, level: true, teacherId: true } }),
      prisma.subject.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
      prisma.student.findMany({
        where: studentFilter,
        select: {
          id: true, firstName: true, lastName: true, otherNames: true, dob: true,
          gender: true, imageUrl: true, classId: true, parentId: true, status: true,
          grades: { where: { term }, include: { subject: true } },
          skillRatings: { where: { term } },
          parent: { select: { id: true, fullName: true, email: true, phone: true } }
        },
        orderBy: { firstName: 'asc' }
      }),
      prisma.studentSubjectOffering.findMany({
        where: { term, student: studentFilter }, select: { studentId: true, subjectId: true }
      })
    ]);
    if (!classInfo) return NextResponse.json({ success: false, error: 'Class not found' }, { status: 404 });

    const explicitByStudent = new Map<string, Set<string>>();
    for (const row of offeringRows) {
      if (!explicitByStudent.has(row.studentId)) explicitByStudent.set(row.studentId, new Set());
      explicitByStudent.get(row.studentId)!.add(row.subjectId);
    }
    const studentsWithOfferings = students.map(student => {
      const explicit = explicitByStudent.get(student.id);
      // Legacy terms without configured offers continue to use subjects with
      // existing grades; new terms use explicit subject-offering assignments.
      const offeredSubjectIds = explicit?.size ? Array.from(explicit) : Array.from(new Set(student.grades.map(grade => grade.subjectId)));
      const offered = new Set(offeredSubjectIds);
      return {
        ...student,
        offeredSubjectIds,
        hasExplicitSubjectOfferings: !!explicit?.size,
        grades: student.grades.filter(grade => offered.has(grade.subjectId))
      };
    });
    const visibleSubjectIds = new Set(studentsWithOfferings.flatMap(student => student.offeredSubjectIds));
    const subjects = allSubjects.filter(subject => visibleSubjectIds.has(subject.id));
    const complete = studentsWithOfferings.length > 0 && studentsWithOfferings.every(student => student.hasExplicitSubjectOfferings);

    return NextResponse.json({ success: true, data: {
      classInfo, subjects, students: studentsWithOfferings, term, approved: !!release?.approvedAt,
      subjectsConfigured: offeringRows.length > 0, subjectOfferingsComplete: complete,
      studentsWithoutConfiguredOfferings: studentsWithOfferings.filter(student => !student.hasExplicitSubjectOfferings).length
    } }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Fetch class report error:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ success: false, error: 'Could not load class report' }, { status: 500 });
  }
}
