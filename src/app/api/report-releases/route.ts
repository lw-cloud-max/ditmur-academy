import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isSuperAdmin } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
const validTerm = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 2 && value.trim().length <= 120;

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !['STAFF', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Staff access required' }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    const term = searchParams.get('term');
    if (!classId || !validTerm(term)) return NextResponse.json({ success: false, error: 'Class and term required' }, { status: 400 });
    const release = await prisma.reportRelease.findUnique({ where: { classId_term: { classId, term: term.trim() } },
      select: { approvedAt: true, approvedBy: true } });
    return NextResponse.json({ success: true, data: { approved: !!release?.approvedAt, approvedAt: release?.approvedAt || null,
      canApprove: isSuperAdmin(session) } });
  } catch (error) {
    console.error('Fetch report release error:', error);
    return NextResponse.json({ success: false, error: 'Could not load approval status' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!isSuperAdmin(session)) return NextResponse.json({ success: false, error: 'Only the super admin may approve term results' }, { status: 403 });
    const { classId, term, approved } = await req.json();
    if (typeof classId !== 'string' || !classId || !validTerm(term) || typeof approved !== 'boolean') {
      return NextResponse.json({ success: false, error: 'Valid class, term and approval status required' }, { status: 400 });
    }
    const key = { classId, term: term.trim() };
    const schoolClass = await prisma.class.findUnique({ where: { id: classId }, select: { id: true } });
    if (!schoolClass) return NextResponse.json({ success: false, error: 'Class not found' }, { status: 404 });
    if (approved) {
      const gradeCount = await prisma.grade.count({ where: { term: key.term, student: { classId } } });
      if (!gradeCount) return NextResponse.json({ success: false, error: 'No grades exist for this class and term yet' }, { status: 409 });
    }
    const release = await prisma.reportRelease.upsert({
      where: { classId_term: key },
      update: { approvedAt: approved ? new Date() : null, approvedBy: approved ? session!.user!.id : null },
      create: { ...key, approvedAt: approved ? new Date() : null, approvedBy: approved ? session!.user!.id : null },
      select: { approvedAt: true }
    });
    return NextResponse.json({ success: true, data: { approved: !!release.approvedAt } });
  } catch (error) {
    console.error('Approve report error:', error);
    return NextResponse.json({ success: false, error: 'Could not update report approval' }, { status: 500 });
  }
}
