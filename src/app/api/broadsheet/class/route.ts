import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    const term = searchParams.get('term') || "Term 1 - 2024";

    if (!classId) return NextResponse.json({ success: false, error: 'classId required' }, { status: 400 });

    const classInfo = await prisma.class.findUnique({ where: { id: classId } });
    const subjects = await prisma.subject.findMany({ orderBy: { name: 'asc' } });
    const students = await prisma.student.findMany({
      where: { classId },
      select: {
        id: true, firstName: true, lastName: true, otherNames: true, dob: true,
        gender: true, imageUrl: true, classId: true, parentId: true, status: true,
        grades: { where: { term }, include: { subject: true } },
        skillRatings: { where: { term } }
      },
      orderBy: { firstName: 'asc' }
    });

    return NextResponse.json({ success: true, data: { classInfo, subjects, students } });
  } catch (error) {
    console.error("Failed to fetch class broadsheet", error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}
