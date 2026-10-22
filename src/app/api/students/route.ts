import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { isSuperAdmin } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get('parentId');
    const classId = searchParams.get('classId');

    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const role = session.user.role;
    const whereClause: any = { status: 'ACTIVE' };
    const studentClassSelect = { id: true, name: true, ...(role === 'STAFF' ? { teacherId: true } : {}) };
    if (role === 'PARENT') whereClause.parentId = session.user.id;
    else if (role === 'STUDENT') whereClause.id = session.user.id;
    else if (!['ADMIN', 'STAFF', 'ACCOUNTANT'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    if (parentId && !whereClause.parentId) whereClause.parentId = parentId;
    if (classId) whereClause.classId = classId;

    const students = await prisma.student.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        otherNames: true,
        dob: true,
        gender: true,
        status: true,
        classId: true,
        parentId: true,
        imageUrl: true,
        badges: true,
        class: { select: studentClassSelect },
        parent: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: { firstName: 'asc' }
    });

    return NextResponse.json({ success: true, data: students });
  } catch (error) {
    console.error('Fetch students error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch students' }, { status: 500 });
  }
}

// PATCH: edit pupil details, assign a class (super admin), or link an
// existing Parent (super admin or the verified teacher of that class).
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user || !['ADMIN', 'STAFF'].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: 'Staff access required' }, { status: 403 });
  }
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    const id = typeof input.id === 'string' ? input.id.trim() : '';
    const action = input.action;
    if (!id || id.length > 150 || !['update_student', 'assign_class', 'link_parent'].includes(String(action))) {
      return NextResponse.json({ success: false, error: 'Valid student and action required' }, { status: 400 });
    }
    const superAdmin = isSuperAdmin(session);
    const select = { id: true, status: true, classId: true, parentId: true } as const;
    const student = await prisma.student.findUnique({ where: { id }, select });
    if (!student || student.status !== 'ACTIVE') {
      return NextResponse.json({ success: false, error: 'Active student not found' }, { status: 404 });
    }

    if (action === 'update_student') {
      if (!superAdmin) return NextResponse.json({ success: false, error: 'Super admin required to edit student records' }, { status: 403 });
      const { firstName, lastName, dob, gender } = input;
      if (typeof firstName !== 'string' || !firstName.trim() || firstName.length > 80 ||
          typeof lastName !== 'string' || !lastName.trim() || lastName.length > 80 ||
          typeof dob !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dob) ||
          !['Male', 'Female'].includes(String(gender))) {
        return NextResponse.json({ success: false, error: 'Valid first name, surname, date of birth and gender are required' }, { status: 400 });
      }
      const date = new Date(`${dob}T00:00:00.000Z`);
      if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dob || date.getTime() > Date.now()) {
        return NextResponse.json({ success: false, error: 'Enter a valid date of birth' }, { status: 400 });
      }
      const updated = await prisma.student.update({ where: { id }, data: {
        firstName: firstName.trim(), lastName: lastName.trim(), dob: date, gender: String(gender)
      }, select: { id: true, firstName: true, lastName: true, status: true } });
      return NextResponse.json({ success: true, data: updated }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'assign_class') {
      if (!superAdmin) return NextResponse.json({ success: false, error: 'Only the super admin may move a student to another class' }, { status: 403 });
      const classId = typeof input.classId === 'string' ? input.classId.trim() : '';
      if (!classId || classId.length > 150 || input.confirmed !== true || !Object.hasOwn(input, 'expectedClassId') ||
          (input.expectedClassId !== null && typeof input.expectedClassId !== 'string')) {
        return NextResponse.json({ success: false, error: 'Select a class and confirm the student’s current class' }, { status: 400 });
      }
      if (classId === student.classId) return NextResponse.json({ success: false, error: 'Student is already in that class' }, { status: 409 });
      const [targetClass, counts] = await Promise.all([
        prisma.class.findUnique({ where: { id: classId }, select: { id: true, name: true } }),
        Promise.all([
          prisma.grade.count({ where: { studentId: id } }),
          prisma.skillRating.count({ where: { studentId: id } }),
          prisma.attendance.count({ where: { studentId: id } }),
          prisma.internalResult.count({ where: { studentId: id } }),
          prisma.cBTResult.count({ where: { studentId: id } }),
          prisma.internalExamAttempt.count({ where: { studentId: id } }),
          prisma.behaviorRecord.count({ where: { studentId: id } }),
          prisma.invoice.count({ where: { studentId: id } })
        ])
      ]);
      if (!targetClass) return NextResponse.json({ success: false, error: 'Selected class not found' }, { status: 404 });
      const expectedClassId = input.expectedClassId as string | null;
      if (student.classId !== expectedClassId) return NextResponse.json({ success: false, error: 'Student class changed. Refresh and try again.' }, { status: 409 });
      const historyCounts = { grades: counts[0], skillRatings: counts[1], attendance: counts[2],
        internalExamResults: counts[3], entranceExamResults: counts[4], examAttempts: counts[5],
        behaviorRecords: counts[6], invoices: counts[7] };
      const hasHistory = Object.values(historyCounts).some(count => count > 0);
      if (hasHistory && input.historyConfirmed !== true) {
        return NextResponse.json({ success: false, needsHistoryConfirmation: true,
          historyCounts, targetClass: targetClass.name,
          error: 'This student has academic or school records. Review the record counts and explicitly confirm before changing class.' },
          { status: 409, headers: { 'Cache-Control': 'no-store' } });
      }
      const where = { id, status: 'ACTIVE', classId: expectedClassId };
      const result = await prisma.student.updateMany({ where, data: { classId } });
      if (result.count !== 1) return NextResponse.json({ success: false, error: 'Student changed while saving. Refresh and try again.' }, { status: 409 });
      return NextResponse.json({ success: true, data: { id, classId, className: targetClass.name, historyCounts } },
        { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'link_parent') {
      const parentId = typeof input.parentId === 'string' ? input.parentId.trim() : '';
      if (!parentId || parentId.length > 150 || input.confirmed !== true || !Object.hasOwn(input, 'expectedParentId') ||
          (input.expectedParentId !== null && typeof input.expectedParentId !== 'string')) {
        return NextResponse.json({ success: false, error: 'Search for and confirm an existing Parent account' }, { status: 400 });
      }
      if (student.parentId !== input.expectedParentId) return NextResponse.json({ success: false, error: 'This student’s Parent link changed. Refresh and try again.' }, { status: 409 });
      if (parentId === student.parentId) return NextResponse.json({ success: false, error: 'This Parent is already linked' }, { status: 409 });
      if (!superAdmin) {
        const teacherRole = session.user.role === 'STAFF' && ['TEACHER', 'ACCOUNTANT_TEACHER'].includes(session.user.staffRole || '');
        if (!teacherRole || !student.classId) return NextResponse.json({ success: false, error: 'A class teacher can link guardians only for an active student in their assigned class' }, { status: 403 });
        const assignedClass = await prisma.class.findUnique({ where: { id: student.classId }, select: { teacherId: true } });
        if (assignedClass?.teacherId !== session.user.id) return NextResponse.json({ success: false, error: 'Only the assigned class teacher or super admin can link this student' }, { status: 403 });
      }
      const parent = await prisma.parent.findUnique({ where: { id: parentId }, select: { id: true } });
      if (!parent) return NextResponse.json({ success: false, error: 'Existing Parent account not found. Do not create a duplicate here.' }, { status: 404 });
      const result = await prisma.student.updateMany({
        where: { id, status: 'ACTIVE', classId: student.classId, parentId: student.parentId },
        data: { parentId }
      });
      if (result.count !== 1) return NextResponse.json({ success: false, error: 'Student or Parent link changed while saving. Refresh and try again.' }, { status: 409 });
      return NextResponse.json({ success: true, data: { id, parentId },
        message: 'Existing Parent linked. Student academic and invoice records remain attached to the Student.' },
        { headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('Update student failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ success: false, error: 'Could not update student. Check the record and try again.' }, { status: 500 });
  }
}

// Permanent deletion is disabled; departing pupils are marked inactive.
export async function DELETE() {
  return NextResponse.json({ success: false, error: 'Permanent Student deletion is disabled. Use Mark Inactive instead.' }, { status: 405 });
}
