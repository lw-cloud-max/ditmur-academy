import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { subjectId, classId, week } = await req.json();

    if (!subjectId || !classId || !week) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    // Fetch the class to get its Level (e.g. Junior Secondary)
    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls) return NextResponse.json({ success: false, error: 'Class not found' }, { status: 404 });

    const scheme = await prisma.ministryScheme.findFirst({
      where: {
        subjectId,
        level: cls.level,
        week: parseInt(week, 10)
      }
    });

    if (!scheme) {
      return NextResponse.json({ success: false, error: `No Ministry Scheme found for Week ${week}.` }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: scheme }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to sync scheme' }, { status: 500 });
  }
}
