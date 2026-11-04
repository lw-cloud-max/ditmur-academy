import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { isSuperAdmin } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store, max-age=0' };
const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const normalizePhone = (value: string) => value.replace(/\D/g, '').replace(/^0/, '234');
const normalizeEmail = (value: string | null) => (value || '').trim().toLowerCase();
type SessionActor = { user?: { id?: string; role?: string; staffRole?: string } } | null | undefined;

function isClassTeacher(session: SessionActor) {
  return session?.user?.role === 'STAFF' && ['TEACHER', 'ACCOUNTANT_TEACHER'].includes(session.user.staffRole || '');
}

type ParentChoice = { id: string; fullName: string; email: string | null; phone: string };

type CreateOutcome =
  | { kind: 'matches'; matches: ParentChoice[] }
  | { kind: 'ambiguous' }
  | { kind: 'partial' }
  | { kind: 'confirm_new' }
  | { kind: 'created'; studentId: string; parentId: string; parentCreated: boolean };

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !(isSuperAdmin(session) || isClassTeacher(session))) {
      return NextResponse.json({ success: false, error: 'Assigned class teacher or super admin required' }, { status: 403, headers: noStore });
    }
    const origin = req.headers.get('origin');
    if (origin && new URL(origin).host !== new URL(req.url).host) {
      return NextResponse.json({ success: false, error: 'Request origin not allowed' }, { status: 403, headers: noStore });
    }
    const raw: unknown = await req.json();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return NextResponse.json({ success: false, error: 'Invalid student form' }, { status: 400, headers: noStore });
    }
    const body = raw as Record<string, unknown>;
    const firstName = clean(body.firstName, 80);
    const lastName = clean(body.lastName, 80);
    const otherNames = clean(body.otherNames, 120) || null;
    const dobInput = clean(body.dob, 10);
    const gender = clean(body.gender, 10);
    const classId = clean(body.classId, 150);
    const parentFullName = clean(body.parentFullName, 160);
    const parentEmailInput = clean(body.parentEmail, 180).toLowerCase();
    const parentEmail = parentEmailInput || null;
    const parentPhone = clean(body.parentPhone, 25);
    const parentPhoneKey = normalizePhone(parentPhone);
    const parentId = clean(body.parentId, 150) || null;
    const confirmedParentMatch = body.confirmedParentMatch === true;
    const confirmedNewParent = body.confirmedNewParent === true;

    if (!firstName || !lastName || !dobInput || !classId || !parentFullName ||
        !['Male', 'Female'].includes(gender) || !/^[+\d()\s-]{7,25}$/.test(parentPhone) ||
        (parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) || !parentPhoneKey || parentPhoneKey.length < 10) {
      return NextResponse.json({ success: false, error: 'Enter valid student details, class, guardian name and phone; email is optional.' }, { status: 400, headers: noStore });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dobInput)) {
      return NextResponse.json({ success: false, error: 'Enter a valid date of birth' }, { status: 400, headers: noStore });
    }
    const dob = new Date(`${dobInput}T00:00:00.000Z`);
    if (Number.isNaN(dob.getTime()) || dob.toISOString().slice(0, 10) !== dobInput || dob.getTime() > Date.now()) {
      return NextResponse.json({ success: false, error: 'Enter a valid date of birth' }, { status: 400, headers: noStore });
    }

    if (parentId && !confirmedParentMatch) {
      return NextResponse.json({ success: false, error: 'Review and confirm the selected existing Parent record first.' }, { status: 400, headers: noStore });
    }
    const schoolClass = await prisma.class.findUnique({ where: { id: classId }, select: { id: true, name: true, teacherId: true } });
    if (!schoolClass) return NextResponse.json({ success: false, error: 'Selected class was not found' }, { status: 404, headers: noStore });
    if (!isSuperAdmin(session) && schoolClass.teacherId !== session.user.id) {
      return NextResponse.json({ success: false, error: 'You may add students only to your assigned class' }, { status: 403, headers: noStore });
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const parents = await tx.parent.findMany({ select: { id: true, fullName: true, email: true, phone: true } });
      const matches = parents.filter(parent => {
        const phoneMatch = normalizePhone(parent.phone) === parentPhoneKey;
        const emailMatch = parentEmail ? normalizeEmail(parent.email) === parentEmail : true;
        return phoneMatch && emailMatch;
      });
      const partialMatches = parents.filter(parent => {
        const phoneMatch = normalizePhone(parent.phone) === parentPhoneKey;
        const emailMatch = !!parentEmail && normalizeEmail(parent.email) === parentEmail;
        return (phoneMatch || emailMatch) && !matches.some(match => match.id === parent.id);
      });

      let chosenParent: ParentChoice | null = null;
      let parentCreated = false;
      if (parentId) {
        chosenParent = matches.find(parent => parent.id === parentId) || null;
        if (!chosenParent) return { kind: 'partial' } as CreateOutcome;
      } else if (matches.length === 1) {
        return { kind: 'matches', matches } as CreateOutcome;
      } else if (matches.length > 1) {
        return { kind: 'ambiguous' } as CreateOutcome;
      } else if (partialMatches.length) {
        return { kind: 'partial' } as CreateOutcome;
      } else if (!confirmedNewParent) {
        return { kind: 'confirm_new' } as CreateOutcome;
      } else {
        chosenParent = await tx.parent.create({ data: {
          fullName: parentFullName, email: parentEmail, phone: parentPhone,
          password: null, mustChangePassword: true, sessionVersion: 0
        }, select: { id: true, fullName: true, email: true, phone: true } });
        parentCreated = true;
      }

      const allStudentIds = await tx.student.findMany({ select: { id: true } });
      let highest = 0;
      for (const row of allStudentIds) {
        const match = /^DIT\/STU\/(\d+)$/.exec(row.id);
        if (match) highest = Math.max(highest, Number(match[1]));
      }
      const studentId = `DIT/STU/${String(highest + 1).padStart(3, '0')}`;
      const student = await tx.student.create({ data: {
        id: studentId, firstName, lastName, otherNames, dob, gender,
        classId, parentId: chosenParent!.id, status: 'ACTIVE',
        password: null, mustChangePassword: true, sessionVersion: 0
      }, select: { id: true } });
      return { kind: 'created', studentId: student.id, parentId: chosenParent!.id, parentCreated } as CreateOutcome;
    }, { isolationLevel: 'Serializable' });

    if (result.kind === 'ambiguous') {
      return NextResponse.json({ success: false, error: 'Multiple Parent records match those contacts. Ask the super admin to review; no records were created.' }, { status: 409, headers: noStore });
    }
    if (result.kind === 'matches') {
      return NextResponse.json({ success: false, needsParentChoice: true, matches: result.matches,
        error: 'An existing Parent matches those contacts. Review and select that Parent to avoid creating a duplicate.'
      }, { status: 409, headers: noStore });
    }
    if (result.kind === 'partial') {
      return NextResponse.json({ success: false, error: 'A Parent record shares some of those contact details. Ask the super admin to review before creating or linking; no records were changed.' }, { status: 409, headers: noStore });
    }
    if (result.kind === 'confirm_new') {
      return NextResponse.json({ success: false, needsNewParentConfirmation: true,
        error: 'No exact Parent match was found. Confirm this is a new guardian record before creating it.' }, { status: 409, headers: noStore });
    }
    return NextResponse.json({ success: true, data: { studentId: result.studentId, parentId: result.parentId,
      parentCreated: result.parentCreated, loginIssued: false },
      message: `Student ${result.studentId} added to ${schoolClass.name}. No login password was issued; ask the super admin to provision it when needed.`
    }, { status: 201, headers: noStore });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && ['P2002', 'P2034'].includes(String(error.code))) {
      return NextResponse.json({ success: false, error: 'The record changed while saving. Refresh, review matches and try again; no duplicate was intentionally created.' }, { status: 409, headers: noStore });
    }
    console.error('Create student failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ success: false, error: 'Could not add the student. Check with the super admin before retrying.' }, { status: 500, headers: noStore });
  }
}
