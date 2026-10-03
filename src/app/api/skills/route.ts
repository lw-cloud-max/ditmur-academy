import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';
const LEGACY_TERM = 'Term 1 - 2024';
const isStaff = (role?: string) => role === 'STAFF' || role === 'ADMIN';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !isStaff(session.user.role)) return NextResponse.json({ success: false, error: 'Teachers and admins only' }, { status: 403 });
    const { classId, term, ratings } = await req.json();
    if (typeof classId !== 'string' || !classId || typeof term !== 'string' || term.trim().length < 3 || term.trim().length > 120 ||
        !Array.isArray(ratings) || !ratings.length || ratings.length > 6000) {
      return NextResponse.json({ success: false, error: 'Class, term and ratings required' }, { status: 400 });
    }
    const safe = ratings.map((item: unknown) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const rating = Number(row.rating);
      if (typeof row.studentId !== 'string' || !row.studentId || typeof row.name !== 'string' || !row.name || row.name.length > 100 ||
          typeof row.category !== 'string' || !row.category || row.category.length > 100 ||
          !Number.isInteger(rating) || rating < 1 || rating > 5) return null;
      return { studentId: row.studentId, name: row.name, category: row.category, rating };
    });
    if (safe.some(row => row === null)) return NextResponse.json({ success: false, error: 'All ratings must be 1-5 and have a student, category and skill' }, { status: 400 });
    const rows = safe as NonNullable<(typeof safe)[number]>[];
    const ids = [...new Set(rows.map(row => row.studentId))];
    const [schoolClass, count] = await Promise.all([
      prisma.class.findUnique({ where: { id: classId }, select: { id: true } }),
      prisma.student.count({ where: { classId, id: { in: ids }, status: 'ACTIVE' } })
    ]);
    if (!schoolClass || count !== ids.length) return NextResponse.json({ success: false, error: 'Ratings include students outside this class' }, { status: 400 });
    const key = term.trim();
    await prisma.$transaction(async tx => {
      for (const row of rows) {
        await tx.skillRating.upsert({
          where: { studentId_name_term: { studentId: row.studentId, name: row.name, term: key } },
          update: { rating: row.rating, category: row.category },
          create: { ...row, term: key }
        });
      }
      await tx.reportRelease.upsert({ where: { classId_term: { classId, term: key } },
        update: { approvedAt: null, approvedBy: null }, create: { classId, term: key } });
    });
    return NextResponse.json({ success: true, message: 'Skills saved as draft; reapproval is required.' });
  } catch (error) {
    console.error('Save skills error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save skills' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !isStaff(session.user.role)) return NextResponse.json({ success: false, error: 'Draft skills are staff-only' }, { status: 403 });
    const params = new URL(req.url).searchParams;
    const classId = params.get('classId');
    const term = (params.get('term') || LEGACY_TERM).trim();
    if (!classId || term.length < 3 || term.length > 120) return NextResponse.json({ success: false, error: 'Class and term required' }, { status: 400 });
    const skills = await prisma.skillRating.findMany({ where: { term, student: { classId } } });
    return NextResponse.json({ success: true, data: skills });
  } catch (error) {
    console.error('Fetch skills error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch skills' }, { status: 500 });
  }
}
