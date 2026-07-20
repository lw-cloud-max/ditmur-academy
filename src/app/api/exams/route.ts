import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const exams = await prisma.entranceExam.findMany({
      orderBy: { scheduledDate: 'desc' },
      include: { _count: { select: { questions: true } } }
    });
    return NextResponse.json({ success: true, data: exams });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch exams' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, scheduledDate, startTime, durationMinutes } = body;

    const newExam = await prisma.entranceExam.create({
      data: {
        title, description,
        scheduledDate: new Date(scheduledDate),
        startTime,
        durationMinutes: parseInt(durationMinutes, 10),
        status: 'UPCOMING'
      }
    });
    return NextResponse.json({ success: true, data: newExam }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create exam' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

    await prisma.entranceExam.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete exam' }, { status: 500 });
  }
}
