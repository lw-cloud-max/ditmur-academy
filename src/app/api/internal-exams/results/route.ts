import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const examId = searchParams.get('examId');

    if (!examId) return NextResponse.json({ success: false, error: 'examId required' }, { status: 400 });

    const results = await prisma.internalResult.findMany({
      where: { examId },
      include: {
        student: {
          include: { class: true }
        }
      },
      orderBy: { score: 'desc' }
    });

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch Internal CBT results' }, { status: 500 });
  }
}
