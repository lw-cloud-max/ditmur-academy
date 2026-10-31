import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { dateKeyToUtcDate, isDateKey, isWeekdayDateKey, nextDateKeyUtcStart } from '@/lib/attendance-calendar';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store, max-age=0' };
const validStatuses = new Set(['PRESENT', 'ABSENT', 'LATE']);

// POST: Save or update explicit attendance marks for one class and date.
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'STAFF'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Staff access required' }, { status: 401, headers: noStore });
    }
    const origin = req.headers.get('origin');
    if (origin && new URL(origin).host !== new URL(req.url).host) {
      return NextResponse.json({ success: false, error: 'Request origin not allowed' }, { status: 403, headers: noStore });
    }

    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: 'Invalid attendance request' }, { status: 400, headers: noStore });
    }
    const input = body as Record<string, unknown>;
    const attendance = input.attendance;
    const date = input.date;
    if (!Array.isArray(attendance) || attendance.length === 0 || attendance.length > 500 || !isDateKey(date)) {
      return NextResponse.json({ success: false, error: 'Choose a date and at least one attendance mark' }, { status: 400, headers: noStore });
    }

    const first = attendance[0] as Record<string, unknown>;
    const classId = typeof first?.classId === 'string' ? first.classId : '';
    if (!classId || classId.length > 150) {
      return NextResponse.json({ success: false, error: 'A valid class is required' }, { status: 400, headers: noStore });
    }
    const rows: { studentId: string; status: string }[] = [];
    const seen = new Set<string>();
    for (const value of attendance) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return NextResponse.json({ success: false, error: 'Invalid attendance record' }, { status: 400, headers: noStore });
      }
      const record = value as Record<string, unknown>;
      if (typeof record.studentId !== 'string' || !record.studentId || record.studentId.length > 150 ||
          record.classId !== classId || typeof record.status !== 'string' || !validStatuses.has(record.status)) {
        return NextResponse.json({ success: false, error: 'Each record needs a student in the same class and a valid status' }, { status: 400, headers: noStore });
      }
      if (seen.has(record.studentId)) return NextResponse.json({ success: false, error: 'A student can only be marked once per date' }, { status: 400, headers: noStore });
      seen.add(record.studentId);
      rows.push({ studentId: record.studentId, status: record.status });
    }

    if (!isWeekdayDateKey(date)) {
      return NextResponse.json({ success: false, error: 'Attendance cannot be marked on weekends under the school calendar rules.' }, { status: 409, headers: noStore });
    }
    const from = dateKeyToUtcDate(date)!;
    const to = nextDateKeyUtcStart(date)!;
    const holiday = await prisma.calendarEvent.findFirst({
      where: { type: { equals: 'holiday', mode: 'insensitive' }, date: { gte: from, lt: to } },
      select: { title: true }
    });
    if (holiday) {
      return NextResponse.json({ success: false, error: `School is closed for “${holiday.title}”. No attendance was changed.` }, { status: 409, headers: noStore });
    }

    const matchingStudents = await prisma.student.findMany({
      where: { id: { in: rows.map(row => row.studentId) }, classId },
      select: { id: true }
    });
    if (matchingStudents.length !== rows.length) {
      return NextResponse.json({ success: false, error: 'One or more students do not belong to the selected class' }, { status: 400, headers: noStore });
    }

    const attendanceDate = dateKeyToUtcDate(date)!;
    const results = await prisma.$transaction(rows.map(record => prisma.attendance.upsert({
      where: { studentId_date: { studentId: record.studentId, date: attendanceDate } },
      create: { studentId: record.studentId, classId, date: attendanceDate, status: record.status, markedBy: session.user.id },
      update: { classId, status: record.status, markedBy: session.user.id }
    })));

    return NextResponse.json({ success: true, data: results }, { headers: noStore });
  } catch (error) {
    console.error('Save attendance error:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ success: false, error: 'Failed to save attendance' }, { status: 500, headers: noStore });
  }
}

// GET: Fetch one class/date register for authenticated school staff only.
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'STAFF'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Staff access required' }, { status: 403, headers: noStore });
    }
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId')?.trim() || '';
    const date = searchParams.get('date');
    const studentId = searchParams.get('studentId')?.trim() || '';
    if (date !== null && !isDateKey(date)) {
      return NextResponse.json({ success: false, error: 'Date must be YYYY-MM-DD' }, { status: 400, headers: noStore });
    }

    const whereClause: Prisma.AttendanceWhereInput = {};
    if (classId) whereClause.classId = classId;
    if (date) {
      const from = dateKeyToUtcDate(date)!;
      const to = nextDateKeyUtcStart(date)!;
      whereClause.date = { gte: from, lt: to };
    }
    if (studentId) whereClause.studentId = studentId;

    const attendance = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        class: { select: { id: true, name: true } }
      },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json({ success: true, data: attendance }, { headers: noStore });
  } catch (error) {
    console.error('Fetch attendance error:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ success: false, error: 'Failed to fetch attendance' }, { status: 500, headers: noStore });
  }
}
