import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isSuperAdmin } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const noStore = { 'Cache-Control': 'private, no-store, max-age=0' };
const allowedImageTypes: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp'
};

export async function POST(req: Request) {
  try {
    const session = await auth();
    const isClassTeacher = session?.user?.role === 'STAFF' && ['TEACHER', 'ACCOUNTANT_TEACHER'].includes(session.user.staffRole || '');
    if (!session?.user || !(isSuperAdmin(session) || isClassTeacher)) {
      return NextResponse.json({ success: false, error: 'Assigned class teacher or super admin required' }, { status: 403, headers: noStore });
    }
    const origin = req.headers.get('origin');
    if (origin && new URL(origin).host !== new URL(req.url).host) {
      return NextResponse.json({ success: false, error: 'Request origin not allowed' }, { status: 403, headers: noStore });
    }
    const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    const storeId = process.env.BLOB_STORE_ID?.trim();
    if (!token && !storeId) return NextResponse.json({ success: false, error: 'Student photo storage is not configured. Connect the Vercel Blob store to this project and redeploy.' }, { status: 503, headers: noStore });

    const formData = await req.formData();
    const file = formData.get('file');
    const studentId = typeof formData.get('studentId') === 'string' ? String(formData.get('studentId')).trim() : '';
    if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function' || !studentId || studentId.length > 150) {
      return NextResponse.json({ success: false, error: 'Image file and valid Student ID are required' }, { status: 400, headers: noStore });
    }
    const extension = allowedImageTypes[file.type];
    if (!extension) return NextResponse.json({ success: false, error: 'Choose a JPEG, PNG, or WebP image' }, { status: 400, headers: noStore });
    if (file.size < 1 || file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'Image must be smaller than 2 MB' }, { status: 400, headers: noStore });
    }

    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true, status: true, classId: true } });
    if (!student || student.status !== 'ACTIVE') return NextResponse.json({ success: false, error: 'Active student not found' }, { status: 404, headers: noStore });
    if (!isSuperAdmin(session)) {
      const assigned = student.classId ? await prisma.class.findUnique({ where: { id: student.classId }, select: { teacherId: true } }) : null;
      if (!isClassTeacher || assigned?.teacherId !== session.user.id) {
        return NextResponse.json({ success: false, error: 'Only the assigned class teacher may upload this student photo' }, { status: 403, headers: noStore });
      }
    }

    const safeId = studentId.replace(/[^A-Za-z0-9_-]/g, '-');
    const blob = await put(`student-photos/${safeId}/profile.${extension}`, file, {
      access: 'public', addRandomSuffix: true, contentType: file.type,
      // On Vercel, the SDK uses the connected store's OIDC credentials when
      // no static token is passed. BLOB_READ_WRITE_TOKEN remains a local/CI fallback.
      ...(token ? { token } : {})
    });
    await prisma.student.update({ where: { id: studentId }, data: { imageUrl: blob.url } });
    return NextResponse.json({ success: true, imageUrl: blob.url }, { headers: noStore });
  } catch (error) {
    console.error('Student photo upload failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ success: false, error: 'Could not upload the image. Check that the Blob store is connected to this Vercel project and redeployed, then retry.' }, { status: 500, headers: noStore });
  }
}
