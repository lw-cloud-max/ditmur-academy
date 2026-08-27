import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get('parentId');
    const classId = searchParams.get('classId');

    const whereClause: any = { status: 'ACTIVE' };
    if (parentId) {
      whereClause.parentId = parentId;
    }
    if (classId) {
      whereClause.classId = classId;
    }

    const students = await prisma.student.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dob: true,
        gender: true,
        status: true,
        classId: true,
        parentId: true,
        imageUrl: true,
        badges: true,
        class: {
          select: {
            id: true,
            name: true
          }
        },
        parent: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: { firstName: 'asc' }
    });

    return NextResponse.json({ success: true, data: students });
  } catch (error) {
    console.error('Fetch students error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch students' }, { status: 500 });
  }
}
