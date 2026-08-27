import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

// GET: Fetch video meetings
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const whereClause: any = {};
    if (type) whereClause.type = type;
    if (status) whereClause.status = status;

    // If user is parent, only show meetings they're invited to
    if (session.user.role === 'PARENT') {
      whereClause.participants = {
        some: {
          userId: session.user.id,
          userType: 'PARENT'
        }
      };
    }

    const meetings = await prisma.videoMeeting.findMany({
      where: whereClause,
      include: {
        host: { select: { id: true, firstName: true, lastName: true, role: true } },
        participants: {
          include: {
            // We can't include user directly since it's polymorphic
            // Just include the participant record
          }
        }
      },
      orderBy: { scheduledAt: 'asc' }
    });

    return NextResponse.json({ success: true, data: meetings });
  } catch (error) {
    console.error('Fetch meetings error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch meetings' }, { status: 500 });
  }
}

// POST: Create new video meeting
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'STAFF')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description, meetingUrl, scheduledAt, duration, type, participantIds } = await req.json();

    if (!title || !meetingUrl || !scheduledAt || !type) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Create meeting
    const meeting = await prisma.videoMeeting.create({
      data: {
        title,
        description,
        hostId: session.user.id,
        meetingUrl,
        scheduledAt: new Date(scheduledAt),
        duration: duration || 30,
        type,
        participants: {
          create: participantIds?.map((p: { userId: string; userType: string }) => ({
            userId: p.userId,
            userType: p.userType
          })) || []
        }
      },
      include: {
        host: { select: { firstName: true, lastName: true } },
        participants: true
      }
    });

    return NextResponse.json({ success: true, data: meeting }, { status: 201 });
  } catch (error) {
    console.error('Create meeting error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create meeting' }, { status: 500 });
  }
}

// PATCH: Update meeting status
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { meetingId, status, participantId, action } = await req.json();

    if (action === 'join') {
      // Record participant joining
      await prisma.videoParticipant.update({
        where: { id: participantId },
        data: { joinedAt: new Date() }
      });
      return NextResponse.json({ success: true, message: 'Joined meeting' });
    }

    if (action === 'leave') {
      // Record participant leaving
      await prisma.videoParticipant.update({
        where: { id: participantId },
        data: { leftAt: new Date() }
      });
      return NextResponse.json({ success: true, message: 'Left meeting' });
    }

    // Update meeting status
    const meeting = await prisma.videoMeeting.update({
      where: { id: meetingId },
      data: { status }
    });

    return NextResponse.json({ success: true, data: meeting });
  } catch (error) {
    console.error('Update meeting error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update meeting' }, { status: 500 });
  }
}
