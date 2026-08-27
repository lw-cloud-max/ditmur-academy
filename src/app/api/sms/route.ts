import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { sendSMS, SMS_TEMPLATES } from '@/lib/termii';

export const dynamic = 'force-dynamic';

// POST: Send SMS notification
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'STAFF')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { type, studentId, message, customMessage } = await req.json();

    // Get student and parent info
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { parent: true }
    });

    if (!student || !student.parent) {
      return NextResponse.json({ success: false, error: 'Student or parent not found' }, { status: 404 });
    }

    if (!student.parent.phone) {
      return NextResponse.json({ success: false, error: 'Parent phone number not available' }, { status: 400 });
    }

    let smsMessage = '';

    // Generate message based on type
    switch (type) {
      case 'ATTENDANCE_PRESENT':
        smsMessage = SMS_TEMPLATES.attendancePresent(
          `${student.firstName} ${student.lastName}`,
          new Date().toLocaleDateString()
        );
        break;
      case 'ATTENDANCE_ABSENT':
        smsMessage = SMS_TEMPLATES.attendanceAbsent(
          `${student.firstName} ${student.lastName}`,
          new Date().toLocaleDateString()
        );
        break;
      case 'ATTENDANCE_LATE':
        smsMessage = SMS_TEMPLATES.attendanceLate(
          `${student.firstName} ${student.lastName}`,
          new Date().toLocaleDateString()
        );
        break;
      case 'RESULT':
        smsMessage = SMS_TEMPLATES.resultPublished(
          `${student.firstName} ${student.lastName}`,
          message || 'this term'
        );
        break;
      case 'FEE_REMINDER':
        smsMessage = SMS_TEMPLATES.feeReminder(
          `${student.firstName} ${student.lastName}`,
          message || '0',
          customMessage || 'soon'
        );
        break;
      case 'ANNOUNCEMENT':
        smsMessage = SMS_TEMPLATES.announcement(customMessage || message);
        break;
      case 'CUSTOM':
        smsMessage = customMessage || message;
        break;
      default:
        return NextResponse.json({ success: false, error: 'Invalid SMS type' }, { status: 400 });
    }

    // Send SMS via Termii
    const result = await sendSMS({ to: student.parent.phone, message: smsMessage });

    // Save notification to database
    const notification = await prisma.sMSNotification.create({
      data: {
        parentId: student.parent.id,
        studentId: student.id,
        type: type,
        message: smsMessage,
        status: result.success ? 'SENT' : 'FAILED',
        termiiMessageId: result.messageId,
        sentAt: result.success ? new Date() : null,
      }
    });

    if (result.success) {
      return NextResponse.json({ success: true, data: notification });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error('SMS API Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send SMS' }, { status: 500 });
  }
}

// GET: Fetch SMS notification history
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get('parentId');
    const studentId = searchParams.get('studentId');

    const whereClause: any = {};
    if (parentId) whereClause.parentId = parentId;
    if (studentId) whereClause.studentId = studentId;

    const notifications = await prisma.sMSNotification.findMany({
      where: whereClause,
      include: {
        student: { select: { firstName: true, lastName: true } },
        parent: { select: { fullName: true, phone: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return NextResponse.json({ success: true, data: notifications });
  } catch (error) {
    console.error('Fetch SMS notifications error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 });
  }
}
