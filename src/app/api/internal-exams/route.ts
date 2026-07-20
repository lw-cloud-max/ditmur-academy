import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const exams = await prisma.internalExam.findMany({
      orderBy: { createdAt: 'desc' },
      include: { 
        class: true,
        subject: true,
        _count: { select: { questions: true } } 
      }
    });
    return NextResponse.json({ success: true, data: exams });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch internal exams' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, classId, subjectId, term, durationMinutes, shuffleQuestions } = body;

    const newExam = await prisma.internalExam.create({
      data: {
        title, 
        classId,
        subjectId,
        term: term || "Term 1 - 2024",
        durationMinutes: parseInt(durationMinutes, 10),
        isActive: false,
        shuffleQuestions: shuffleQuestions || false
      }
    });
    return NextResponse.json({ success: true, data: newExam }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create internal exam' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, isActive } = body;

    const updated = await prisma.internalExam.update({
      where: { id },
      data: { isActive }
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update exam status' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

    await prisma.internalExam.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete exam' }, { status: 500 });
  }
}
