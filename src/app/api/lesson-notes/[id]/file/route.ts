import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { STORED_FILE_PREFIX } from '@/lib/lesson-note-file';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await context.params;
    const note = await prisma.lessonPlan.findUnique({
      where: { id },
      select: { classId: true, teacherId: true, status: true, schemeOfWork: true,
        fileUrl: true, fileName: true, fileType: true }
    });
    if (!note || note.schemeOfWork !== null || !note.fileUrl?.startsWith(STORED_FILE_PREFIX)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    const role = session.user.role;
    if (role === 'STUDENT') {
      const student = await prisma.student.findUnique({ where: { id: session.user.id }, select: { classId: true } });
      if (!student?.classId || note.classId !== student.classId || note.status !== 'PUBLISHED') {
        return NextResponse.json({ error: 'File not available' }, { status: 403 });
      }
    } else if (role !== 'ADMIN' && !(role === 'STAFF' && note.teacherId === session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const bytes = Buffer.from(note.fileUrl.slice(STORED_FILE_PREFIX.length), 'base64');
    const name = (note.fileName || 'lesson-note.pdf').replace(/[\r\n"\\]/g, '').slice(0, 120);
    return new Response(new Uint8Array(bytes), {
      headers: {
        'Content-Type': note.fileType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${name.replace(/[^\x20-\x7E]/g, '_')}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store'
      }
    });
  } catch (error) {
    console.error('Download lesson note error:', error);
    return NextResponse.json({ error: 'Could not download file' }, { status: 500 });
  }
}
