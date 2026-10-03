import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { isSuperAdmin } from '@/lib/permissions';
import { getSMSConfig, sendSMS, SMS_TEMPLATES } from '@/lib/africastalking';

export const dynamic = 'force-dynamic';
const validTypes = ['ATTENDANCE_PRESENT', 'ATTENDANCE_ABSENT', 'ATTENDANCE_ABSENT_EXCUSED', 'ATTENDANCE_LATE', 'RESULT', 'FEE_REMINDER', 'ANNOUNCEMENT', 'CUSTOM'];

export async function GET(req: Request) {
  try {
    if (!isSuperAdmin(await auth())) return NextResponse.json({ success: false, error: 'Super admin required' }, { status: 403 });
    if (new URL(req.url).searchParams.get('config') === '1') {
      const config = getSMSConfig();
      return NextResponse.json({ success: true, data: config }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    const notifications = await prisma.sMSNotification.findMany({
      include: { student: { select: { firstName: true, lastName: true } },
        parent: { select: { fullName: true, phone: true } } },
      orderBy: { createdAt: 'desc' }, take: 50
    });
    return NextResponse.json({ success: true, data: notifications }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('SMS history error:', error);
    return NextResponse.json({ success: false, error: 'Could not load SMS history' }, { status: 500 });
  }
}

// A super admin explicitly confirms ONE parent recipient. No scheduled sends,
// background broadcasts or auto-send on grades/attendance changes.
export async function POST(req: Request) {
  try {
    if (!isSuperAdmin(await auth())) return NextResponse.json({ success: false, error: 'Super admin required' }, { status: 403 });
    const config = getSMSConfig();
    if (!config.enabled) return NextResponse.json({ success: false, error: config.reason }, { status: 503 });
    const { type, studentId, customMessage, term, confirmed } = await req.json();
    if (confirmed !== true || !validTypes.includes(type) || typeof studentId !== 'string' || !studentId) {
      return NextResponse.json({ success: false, error: 'Confirm one student and an SMS type before sending' }, { status: 400 });
    }
    const student = await prisma.student.findUnique({ where: { id: studentId }, select: {
      id: true, firstName: true, lastName: true, classId: true, status: true,
      parent: { select: { id: true, phone: true } }
    } });
    if (!student || student.status !== 'ACTIVE' || !student.parent?.phone) {
      return NextResponse.json({ success: false, error: 'Active student with a parent phone is required' }, { status: 404 });
    }
    const name = `${student.firstName} ${student.lastName}`;
    const date = new Date().toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos' });
    let text: string;
    switch (type) {
      case 'ATTENDANCE_PRESENT': text = SMS_TEMPLATES.attendancePresent(name, date); break;
      case 'ATTENDANCE_ABSENT': text = SMS_TEMPLATES.attendanceAbsent(name, date, false); break;
      case 'ATTENDANCE_ABSENT_EXCUSED': text = SMS_TEMPLATES.attendanceAbsent(name, date, true); break;
      case 'ATTENDANCE_LATE': text = SMS_TEMPLATES.attendanceLate(name, date); break;
      case 'RESULT': {
        if (typeof term !== 'string' || term.trim().length < 3 || term.length > 120 || !student.classId) {
          return NextResponse.json({ success: false, error: 'An approved class and term are required for a result notice' }, { status: 400 });
        }
        const release = await prisma.reportRelease.findUnique({ where: { classId_term: { classId: student.classId, term: term.trim() } }, select: { approvedAt: true } });
        if (!release?.approvedAt) return NextResponse.json({ success: false, error: 'Term results have not been approved for this class' }, { status: 409 });
        text = SMS_TEMPLATES.resultPublished(term.trim());
        break;
      }
      case 'FEE_REMINDER': {
        const unpaid = await prisma.invoice.count({ where: { studentId, status: { in: ['PENDING', 'OVERDUE'] } } });
        if (!unpaid) return NextResponse.json({ success: false, error: 'No outstanding invoice for this student' }, { status: 409 });
        text = SMS_TEMPLATES.feeReminder();
        break;
      }
      case 'ANNOUNCEMENT':
      case 'CUSTOM':
        if (typeof customMessage !== 'string' || !customMessage.trim() || customMessage.length > 260) {
          return NextResponse.json({ success: false, error: 'Enter a message of 1-260 characters' }, { status: 400 });
        }
        text = type === 'ANNOUNCEMENT' ? SMS_TEMPLATES.announcement(customMessage.trim()) : customMessage.trim();
        break;
      default: return NextResponse.json({ success: false, error: 'Invalid SMS type' }, { status: 400 });
    }
    const result = await sendSMS({ to: student.parent.phone, message: text });
    // Keep the attempt in school records, even if the provider rejected it or
    // the network timed out. "ACCEPTED" is not proof of handset delivery.
    const notification = await prisma.sMSNotification.create({ data: {
      parentId: student.parent.id, studentId: student.id, type, message: text,
      status: result.status, termiiMessageId: result.messageId || null,
      sentAt: result.success ? new Date() : null
    } });
    if (!result.success) return NextResponse.json({ success: false, error: result.error, status: result.status }, { status: 502 });
    return NextResponse.json({ success: true, data: { id: notification.id, status: 'ACCEPTED' },
      message: config.mode === 'sandbox' ? 'Accepted by sandbox simulator; no real SMS sent.' : 'Accepted by provider. Delivery to the phone is not yet confirmed.'
    });
  } catch (error) {
    console.error('SMS request error:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ success: false, error: 'SMS request failed. Check notification history before retrying.' }, { status: 500 });
  }
}

// Retain SMS attempts as a billing/compliance audit trail.
export async function DELETE() {
  return NextResponse.json({ success: false, error: 'SMS history cannot be deleted' }, { status: 405 });
}
