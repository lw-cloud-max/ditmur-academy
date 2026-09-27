import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { isSuperAdmin } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const subjects = await prisma.subject.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json({ success: true, data: subjects });
  } catch (error) {
    console.error('Fetch subjects error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch subjects' }, { status: 500 });
  }
}

function validatedName(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

export async function POST(req: Request) {
  try {
    if (!isSuperAdmin(await auth())) return NextResponse.json({ success: false, error: 'Super admin required' }, { status: 403 });
    const { name } = await req.json();
    const clean = validatedName(name);
    if (clean.length < 2 || clean.length > 120) return NextResponse.json({ success: false, error: 'Enter a subject name (2-120 characters)' }, { status: 400 });
    const subject = await prisma.subject.create({ data: { name: clean } });
    return NextResponse.json({ success: true, data: subject }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'A subject with this name already exists' }, { status: 409 });
    }
    console.error('Create subject error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create subject' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    if (!isSuperAdmin(await auth())) return NextResponse.json({ success: false, error: 'Super admin required' }, { status: 403 });
    const { id, name } = await req.json();
    const clean = validatedName(name);
    if (typeof id !== 'string' || !id || clean.length < 2 || clean.length > 120) {
      return NextResponse.json({ success: false, error: 'Subject ID and a valid new name required' }, { status: 400 });
    }
    const subject = await prisma.subject.update({ where: { id }, data: { name: clean } });
    return NextResponse.json({ success: true, data: subject });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'A subject with this name already exists' }, { status: 409 });
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Subject no longer exists' }, { status: 404 });
    }
    console.error('Rename subject error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update subject' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!isSuperAdmin(await auth())) return NextResponse.json({ success: false, error: 'Super admin required' }, { status: 403 });
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });
    // Protect existing grades, notes and exam history from cascade deletion.
    const counts = await Promise.all([
      prisma.grade.count({ where: { subjectId: id } }),
      prisma.lessonPlan.count({ where: { subjectId: id } }),
      prisma.internalExamNew.count({ where: { subjectId: id } }),
      prisma.internalExam.count({ where: { subjectId: id } }),
      prisma.internalQuestionBank.count({ where: { subjectId: id } }),
      prisma.questionBank.count({ where: { subjectId: id } }),
      prisma.timetableEntry.count({ where: { subjectId: id } }),
      prisma.ministryScheme.count({ where: { subjectId: id } })
    ]);
    if (counts.some(count => count > 0)) return NextResponse.json({ success: false, error: 'Subject is in use by school records. Rename it instead of deleting it.' }, { status: 409 });
    await prisma.subject.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete subject error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete subject' }, { status: 500 });
  }
}
