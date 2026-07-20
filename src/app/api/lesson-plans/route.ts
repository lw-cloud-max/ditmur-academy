import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    const subjectId = searchParams.get('subjectId');

    const where: any = {};
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;

    const plans = await prisma.lessonPlan.findMany({
      where,
      include: { class: true, subject: true, teacher: true },
      orderBy: [
        { classId: 'asc' },
        { week: 'asc' }
      ]
    });

    return NextResponse.json({ success: true, data: plans });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch lesson plans' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, week, subjectId, classId, teacherId, schemeOfWork, lessonNote, evaluation, assignment, status } = body;

    const plan = await prisma.lessonPlan.create({
      data: {
        title,
        week: parseInt(week, 10),
        subjectId,
        classId,
        teacherId: teacherId || null,
        schemeOfWork,
        lessonNote,
        evaluation,
        assignment,
        status: status || "DRAFT"
      }
    });

    return NextResponse.json({ success: true, data: plan }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create lesson plan' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

    await prisma.lessonPlan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete lesson plan' }, { status: 500 });
  }
}
