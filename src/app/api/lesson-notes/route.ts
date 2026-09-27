import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { noteHasAttachment, readNoteFile } from '@/lib/lesson-note-file';

export const dynamic = 'force-dynamic';

const relations = {
  subject: { select: { id: true, name: true } },
  class: { select: { id: true, name: true } },
  teacher: { select: { id: true, firstName: true, lastName: true } }
} as const;
const isEditor = (role?: string) => role === 'ADMIN' || role === 'STAFF';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (!isEditor(session.user.role) && session.user.role !== 'STUDENT')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const subjectId = searchParams.get('subjectId');
    const student = session.user.role === 'STUDENT'
      ? await prisma.student.findUnique({ where: { id: session.user.id }, select: { classId: true } })
      : null;
    if (session.user.role === 'STUDENT' && !student) {
      return NextResponse.json({ success: false, error: 'Student record not found' }, { status: 404 });
    }
    const access = student
      ? { status: 'PUBLISHED', classId: student.classId || '__no_class__' }
      : session.user.role === 'STAFF' ? { teacherId: session.user.id } : {};

    if (id) {
      const note = await prisma.lessonPlan.findFirst({
        where: { id, schemeOfWork: null, ...access },
        include: relations
      });
      if (!note) return NextResponse.json({ success: false, error: 'Note not found or unavailable' }, { status: 404 });
      const { fileUrl, ...safeNote } = note;
      return NextResponse.json({ success: true, data: { ...safeNote, hasFile: noteHasAttachment(fileUrl) } });
    }
    const notes = await prisma.lessonPlan.findMany({
      where: { schemeOfWork: null, ...access, ...(subjectId ? { subjectId } : {}) },
      select: {
        id: true, title: true, week: true, status: true, fileName: true,
        subjectId: true, classId: true, updatedAt: true,
        ...relations
      },
      orderBy: { updatedAt: 'desc' }
    });
    return NextResponse.json({ success: true, data: notes });
  } catch (error) {
    console.error('List lesson notes error:', error);
    return NextResponse.json({ success: false, error: 'Could not load lesson notes' }, { status: 500 });
  }
}

// One multipart request saves the note, evaluation, assignment and optional
// attachment together. No transient public/uploads files are used on Vercel.
async function save(req: Request, existingId?: string) {
  try {
    const session = await auth();
    if (!session?.user || !isEditor(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Only teachers and admins can save notes' }, { status: 403 });
    }
    const form = await req.formData();
    const text = (key: string) => String(form.get(key) || '').trim();
    const title = text('title');
    const subjectId = text('subjectId');
    const classId = text('classId');
    const lessonNote = text('lessonNote');
    const evaluation = text('evaluation');
    const assignment = text('assignment');
    const status = text('status');
    const week = Number(text('week') || 1);
    const upload = form.get('file');
    const hasUpload = upload instanceof File && upload.size > 0;
    const existing = existingId ? await prisma.lessonPlan.findUnique({ where: { id: existingId } }) : null;
    if (existingId && (!existing || existing.schemeOfWork !== null)) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }
    if (existing && session.user.role !== 'ADMIN' && existing.teacherId !== session.user.id) {
      return NextResponse.json({ success: false, error: 'You can only edit your own notes' }, { status: 403 });
    }
    if (title.length < 2 || title.length > 200 || !subjectId || !classId ||
        !Number.isInteger(week) || week < 1 || week > 52 ||
        !['DRAFT', 'PUBLISHED'].includes(status) ||
        lessonNote.length > 30000 || evaluation.length > 8000 || assignment.length > 8000 ||
        (!lessonNote && !hasUpload && !(existing && noteHasAttachment(existing.fileUrl) && text('removeFile') !== 'true'))) {
      return NextResponse.json({ success: false, error: 'Enter a topic, subject, class, valid week and note text or file' }, { status: 400 });
    }
    const [subject, schoolClass] = await Promise.all([
      prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true } }),
      prisma.class.findUnique({ where: { id: classId }, select: { id: true } })
    ]);
    if (!subject || !schoolClass) {
      return NextResponse.json({ success: false, error: 'Choose an existing subject and class' }, { status: 400 });
    }
    let attachment: { fileUrl: string | null; fileName: string | null; fileType: string | null; fileSize: number | null } | undefined;
    if (hasUpload) {
      try { attachment = await readNoteFile(upload); }
      catch (error) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Invalid file' }, { status: 400 });
      }
    } else if (text('removeFile') === 'true') {
      attachment = { fileUrl: null, fileName: null, fileType: null, fileSize: null };
    }
    const data = {
      title, subjectId, classId, week, lessonNote: lessonNote || null,
      evaluation: evaluation || null, assignment: assignment || null, status,
      ...(attachment || {})
    };
    let note;
    if (existingId) {
      note = await prisma.lessonPlan.update({ where: { id: existingId }, data, select: { id: true } });
    } else {
      const teacher = await prisma.staff.findUnique({ where: { id: session.user.id }, select: { id: true } });
      if (session.user.role === 'STAFF' && !teacher) {
        return NextResponse.json({ success: false, error: 'Staff profile not found' }, { status: 403 });
      }
      note = await prisma.lessonPlan.create({
        data: { ...data, teacherId: teacher?.id || null, schemeOfWork: null },
        select: { id: true }
      });
    }
    return NextResponse.json({ success: true, data: note }, { status: existingId ? 200 : 201 });
  } catch (error) {
    console.error('Save lesson note error:', error);
    return NextResponse.json({ success: false, error: 'Could not save lesson note' }, { status: 500 });
  }
}

export async function POST(req: Request) { return save(req); }
export async function PUT(req: Request) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, error: 'Note ID required' }, { status: 400 });
  return save(req, id);
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !isEditor(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Note ID required' }, { status: 400 });
    const note = await prisma.lessonPlan.findUnique({ where: { id }, select: { teacherId: true, schemeOfWork: true } });
    if (!note || note.schemeOfWork !== null) return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    if (session.user.role !== 'ADMIN' && note.teacherId !== session.user.id) {
      return NextResponse.json({ success: false, error: 'You can only delete your own notes' }, { status: 403 });
    }
    await prisma.lessonPlan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete lesson note error:', error);
    return NextResponse.json({ success: false, error: 'Could not delete note' }, { status: 500 });
  }
}
