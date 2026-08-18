import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentId, subjectId, score, totalQuestions, percentage } = body;

    if (!studentId || !subjectId || typeof score !== 'number' || typeof totalQuestions !== 'number') {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const result = await prisma.studyResult.create({
      data: {
        studentId: String(studentId).toUpperCase().trim(),
        subjectId,
        score: Number(score),
        totalQuestions: Number(totalQuestions),
        percentage: Number(percentage ?? Math.round((Number(score) / Number(totalQuestions)) * 100)),
      },
      include: { subject: true },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Study result save error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save study result' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Student ID required' }, { status: 400 });
    }

    const results = await prisma.studyResult.findMany({
      where: { studentId: String(studentId).toUpperCase().trim() },
      include: { subject: true },
      orderBy: { completedAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error('Study result fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch study results' }, { status: 500 });
  }
}
