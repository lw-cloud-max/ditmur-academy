import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get('subjectId');
    const level = searchParams.get('level');
    const week = searchParams.get('week');

    const where: any = {};
    if (subjectId) where.subjectId = subjectId;
    if (level) where.level = level;
    if (week) where.week = parseInt(week, 10);

    const schemes = await prisma.ministryScheme.findMany({
      where,
      orderBy: { week: 'asc' },
      include: { subject: true }
    });

    return NextResponse.json({ success: true, data: schemes });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch schemes' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subjectId, level, week, topic, objectives } = body;

    const scheme = await prisma.ministryScheme.create({
      data: {
        subjectId,
        level,
        week: parseInt(week, 10),
        topic,
        objectives
      }
    });

    return NextResponse.json({ success: true, data: scheme }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save scheme' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

    await prisma.ministryScheme.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete scheme' }, { status: 500 });
  }
}
