import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  computeAttendanceSummary, dateKeyFromDate, dateKeyInNigeria, dateKeyToUtcDate,
  makeUnavailableAttendanceSummary, nextDateKeyUtcStart
} from '@/lib/attendance-calendar';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store, max-age=0' };

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: noStore });
    const role = session.user.role;
    if (!['ADMIN', 'STAFF', 'STUDENT', 'PARENT'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403, headers: noStore });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId')?.trim() || '';
    const termLabel = searchParams.get('term')?.trim() || '';
    if (!studentId || studentId.length > 150 || termLabel.length < 3 || termLabel.length > 120) {
      return NextResponse.json({ success: false, error: 'Student and term are required' }, { status: 400, headers: noStore });
    }
    if (role === 'STUDENT' && session.user.id !== studentId) {
      return NextResponse.json({ success: false, error: 'Attendance not available for this account' }, { status: 403, headers: noStore });
    }
    if (role === 'PARENT') {
      const linkedChild = await prisma.student.findFirst({ where: { id: studentId, parentId: session.user.id }, select: { id: true } });
      if (!linkedChild) return NextResponse.json({ success: false, error: 'Attendance not available for this family' }, { status: 403, headers: noStore });
    }

    const terms = await prisma.academicTerm.findMany({ select: { name: true, session: true, startDate: true, endDate: true } });
    const term = terms.find(item => `${item.name} ${item.session}`.trim() === termLabel);
    if (!term || !term.startDate || !term.endDate) {
      return NextResponse.json({ success: true, data: makeUnavailableAttendanceSummary(
        'Attendance totals need this term’s start and end dates. Set them in school Configuration.'
      ) }, { headers: noStore });
    }

    const termStart = dateKeyFromDate(term.startDate);
    const termEnd = dateKeyFromDate(term.endDate);
    if (!termStart || !termEnd || termEnd < termStart) {
      return NextResponse.json({ success: true, data: makeUnavailableAttendanceSummary(
        'Attendance totals need valid term dates. Check the term dates in school Configuration.'
      ) }, { headers: noStore });
    }

    const asOf = dateKeyInNigeria();
    const throughDate = asOf < termEnd ? asOf : termEnd;
    let holidays: string[] = [];
    let records: { date: Date; status: string }[] = [];

    if (throughDate >= termStart) {
      const from = dateKeyToUtcDate(termStart)!;
      const to = nextDateKeyUtcStart(throughDate)!;
      const [eventRows, attendanceRows] = await Promise.all([
        prisma.calendarEvent.findMany({
          where: { type: { equals: 'holiday', mode: 'insensitive' }, date: { gte: from, lt: to } },
          select: { date: true }
        }),
        prisma.attendance.findMany({
          where: { studentId, date: { gte: from, lt: to } },
          select: { date: true, status: true }
        })
      ]);
      holidays = eventRows.map(row => dateKeyFromDate(row.date)).filter((value): value is string => !!value);
      records = attendanceRows;
    }

    const data = computeAttendanceSummary({ termStart, termEnd, asOf, holidays, records });
    return NextResponse.json({ success: true, data }, { headers: noStore });
  } catch (error) {
    console.error('Attendance summary error:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ success: false, error: 'Could not calculate attendance totals' }, { status: 500, headers: noStore });
  }
}
