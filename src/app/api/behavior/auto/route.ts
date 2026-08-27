import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

// POST: Automatically award behavior points based on attendance
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'STAFF')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { studentId, attendanceStatus, date, term, reason, isExcused } = await req.json();

    if (!studentId || !attendanceStatus || !term) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Check if behavior record already exists for this date
    const existingRecord = await prisma.behaviorRecord.findFirst({
      where: {
        studentId,
        term,
        title: { contains: attendanceStatus === 'PRESENT' ? 'Perfect Attendance' : attendanceStatus === 'LATE' ? 'Late Arrival' : 'Absence' }
      }
    });

    if (existingRecord) {
      return NextResponse.json({ success: true, message: 'Behavior record already exists for this period' });
    }

    let behaviorData: any = null;

    // Award points based on attendance status
    switch (attendanceStatus) {
      case 'PRESENT':
        // Award merit for perfect attendance
        behaviorData = {
          type: 'MERIT',
          points: 2,
          category: 'DISCIPLINE',
          title: 'Perfect Attendance',
          description: `Present on ${new Date(date).toLocaleDateString()}`,
          awardedBy: session.user.id
        };
        break;

      case 'LATE':
        // Small demerit for being late
        behaviorData = {
          type: 'DEMERIT',
          points: 1,
          category: 'DISCIPLINE',
          title: 'Late Arrival',
          description: `Arrived late on ${new Date(date).toLocaleDateString()}`,
          awardedBy: session.user.id
        };
        break;

      case 'ABSENT':
        // Only award demerit for UNEXCUSED absences
        if (!isExcused) {
          behaviorData = {
            type: 'DEMERIT',
            points: 3,
            category: 'DISCIPLINE',
            title: 'Unexcused Absence',
            description: reason 
              ? `Absent on ${new Date(date).toLocaleDateString()} - Reason: ${reason}`
              : `Absent on ${new Date(date).toLocaleDateString()} - No reason provided`,
            awardedBy: session.user.id
          };
        } else {
          // Excused absence - no demerit, but log it
          behaviorData = {
            type: 'MERIT',
            points: 0,
            category: 'DISCIPLINE',
            title: 'Excused Absence',
            description: reason 
              ? `Excused absence on ${new Date(date).toLocaleDateString()} - Reason: ${reason}`
              : `Excused absence on ${new Date(date).toLocaleDateString()}`,
            awardedBy: session.user.id
          };
        }
        break;

      default:
        return NextResponse.json({ success: false, error: 'Invalid attendance status' }, { status: 400 });
    }

    // Create behavior record
    const record = await prisma.behaviorRecord.create({
      data: {
        studentId,
        ...behaviorData,
        term
      }
    });

    // Update student badges
    await updateStudentBadges(studentId);

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error('Auto behavior error:', error);
    return NextResponse.json({ success: false, error: 'Failed to award automatic behavior points' }, { status: 500 });
  }
}

// POST: Award weekly perfect attendance bonus
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'STAFF')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { studentId, term, weekNumber } = await req.json();

    // Check attendance records for the week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        studentId,
        date: { gte: weekStart }
      }
    });

    // Check if student was present all week
    const allPresent = attendanceRecords.every((r: any) => r.status === 'PRESENT');

    if (!allPresent) {
      return NextResponse.json({ success: false, error: 'Student was not present all week' }, { status: 400 });
    }

    // Check if weekly bonus already awarded
    const existingBonus = await prisma.behaviorRecord.findFirst({
      where: {
        studentId,
        term,
        title: 'Weekly Perfect Attendance Bonus'
      }
    });

    if (existingBonus) {
      return NextResponse.json({ success: true, message: 'Weekly bonus already awarded' });
    }

    // Award weekly bonus
    const record = await prisma.behaviorRecord.create({
      data: {
        studentId,
        type: 'MERIT',
        points: 10,
        category: 'DISCIPLINE',
        title: 'Weekly Perfect Attendance Bonus',
        description: `Perfect attendance for week ${weekNumber || 'this week'}`,
        awardedBy: session.user.id,
        term
      }
    });

    // Update student badges
    await updateStudentBadges(studentId);

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error('Weekly bonus error:', error);
    return NextResponse.json({ success: false, error: 'Failed to award weekly bonus' }, { status: 500 });
  }
}

// Helper function to update student badges
async function updateStudentBadges(studentId: string) {
  try {
    const records = await prisma.behaviorRecord.findMany({
      where: { studentId }
    });

    const totalMerit = records.filter(r => r.type === 'MERIT').reduce((sum, r) => sum + r.points, 0);
    
    const badges: string[] = [];

    // Award badges based on merit points
    if (totalMerit >= 100) badges.push('Gold Scholar');
    if (totalMerit >= 50) badges.push('Silver Star');
    if (totalMerit >= 25) badges.push('Bronze Achiever');
    if (totalMerit >= 10) badges.push('Rising Star');

    // Category-specific badges
    const disciplineMerit = records.filter(r => r.type === 'MERIT' && r.category === 'DISCIPLINE').reduce((sum, r) => sum + r.points, 0);

    if (disciplineMerit >= 30) badges.push('Discipline Champion');

    // Update student badges
    await prisma.student.update({
      where: { id: studentId },
      data: { badges: badges.join(',') }
    });
  } catch (error) {
    console.error('Update badges error:', error);
  }
}
