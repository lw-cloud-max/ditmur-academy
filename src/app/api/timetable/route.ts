import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');

    if (!classId) return NextResponse.json({ success: false, error: 'Class ID is required' }, { status: 400 });

    const entries = await prisma.timetableEntry.findMany({
      where: { classId },
      include: {
        subject: true,
        teacher: true
      }
    });

    return NextResponse.json({ success: true, data: entries });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch timetable' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { classId, subjectId, teacherId, dayOfWeek, startTime, endTime, room } = body;

    const entry = await prisma.timetableEntry.create({
      data: {
        classId,
        subjectId,
        teacherId: teacherId || null,
        dayOfWeek,
        startTime,
        endTime,
        room: room || null
      },
      include: {
        subject: true,
        teacher: true
      }
    });

    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create timetable entry' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: 'Entry ID required' }, { status: 400 });

    await prisma.timetableEntry.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete entry' }, { status: 500 });
  }
}
