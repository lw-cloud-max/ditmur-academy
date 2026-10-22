import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isSuperAdmin } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store, max-age=0' };

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !['ADMIN', 'STAFF'].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: 'Staff access required' }, { status: 403, headers: noStore });
  }
  try {
    const params = new URL(req.url).searchParams;
    const studentId = params.get('studentId')?.trim() || '';
    const search = params.get('search')?.trim() || '';
    if (!studentId || studentId.length > 150 || search.length < 2 || search.length > 100) {
      return NextResponse.json({ success: false, error: 'Student ID and at least two search characters are required' }, { status: 400, headers: noStore });
    }
    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true, status: true, classId: true } });
    if (!student || student.status !== 'ACTIVE') return NextResponse.json({ success: false, error: 'Active student not found' }, { status: 404, headers: noStore });
    if (!isSuperAdmin(session)) {
      const isTeacher = session.user.role === 'STAFF' && ['TEACHER', 'ACCOUNTANT_TEACHER'].includes(session.user.staffRole || '');
      const assigned = student.classId ? await prisma.class.findUnique({ where: { id: student.classId }, select: { teacherId: true } }) : null;
      if (!isTeacher || assigned?.teacherId !== session.user.id) {
        return NextResponse.json({ success: false, error: 'Only the assigned class teacher can search Parent accounts for this student' }, { status: 403, headers: noStore });
      }
    }
    const data = await prisma.parent.findMany({
      where: { OR: [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } }
      ] },
      select: { id: true, fullName: true, email: true, phone: true,
        students: { where: { status: 'ACTIVE' }, select: { id: true, firstName: true, lastName: true,
          class: { select: { name: true } } }, orderBy: { firstName: 'asc' }, take: 10 } },
      orderBy: { fullName: 'asc' }, take: 25
    });
    return NextResponse.json({ success: true, data }, { headers: noStore });
  } catch {
    return NextResponse.json({ success: false, error: 'Could not search existing Parent accounts' }, { status: 500, headers: noStore });
  }
}
