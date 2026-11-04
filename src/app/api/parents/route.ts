import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { isSuperAdmin } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store, max-age=0' };
const normalizeEmail = (value: string | null) => (value || '').trim().toLowerCase();
type SessionActor = { user?: { id?: string; role?: string; staffRole?: string } } | null | undefined;

function isClassTeacher(session: SessionActor) {
  return session?.user?.role === 'STAFF' && ['TEACHER', 'ACCOUNTANT_TEACHER'].includes(session.user.staffRole || '');
}

// Parents see only their own household. A class teacher sees only Parents with
// an active child in a class currently assigned to that teacher.
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !(isSuperAdmin(session) || session.user.role === 'PARENT' || isClassTeacher(session))) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403, headers: noStore });
    }
    const search = new URL(req.url).searchParams.get('search')?.trim() || '';
    if (search.length > 100) return NextResponse.json({ success: false, error: 'Search term is too long' }, { status: 400, headers: noStore });

    let where: Prisma.ParentWhereInput = {};
    if (session.user.role === 'PARENT') where = { id: session.user.id };
    else if (!isSuperAdmin(session)) {
      where = { students: { some: {
        status: 'ACTIVE', class: { is: { teacherId: session.user.id } }
      } } };
    }
    if (search) {
      const searchWhere: Prisma.ParentWhereInput = { OR: [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { students: { some: { firstName: { contains: search, mode: 'insensitive' } } } },
        { students: { some: { lastName: { contains: search, mode: 'insensitive' } } } }
      ] };
      where = Object.keys(where).length ? { AND: [where, searchWhere] } : searchWhere;
    }
    const studentFilter = isClassTeacher(session) ? { status: 'ACTIVE' as const, class: { is: { teacherId: session.user.id } } } : undefined;
    const parents = await prisma.parent.findMany({
      where,
      select: { id: true, fullName: true, email: true, phone: true, createdAt: true,
        students: { where: studentFilter, select: { id: true, firstName: true, lastName: true,
          classId: true, class: { select: { name: true } } } }
      },
      orderBy: { fullName: 'asc' }
    });
    return NextResponse.json({ success: true, data: parents }, { headers: noStore });
  } catch (error) {
    console.error('Fetch parents error:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ success: false, error: 'Failed to fetch parents' }, { status: 500, headers: noStore });
  }
}

// Super admin can edit any Parent. An assigned class teacher may correct the
// name, email and phone only for a Parent with an active child in that class.
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !(isSuperAdmin(session) || isClassTeacher(session))) {
      return NextResponse.json({ success: false, error: 'Assigned class teachers or super admin required' }, { status: 403, headers: noStore });
    }
    const origin = req.headers.get('origin');
    if (origin && new URL(origin).host !== new URL(req.url).host) {
      return NextResponse.json({ success: false, error: 'Request origin not allowed' }, { status: 403, headers: noStore });
    }
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: 'Invalid Parent update' }, { status: 400, headers: noStore });
    }
    const input = body as Record<string, unknown>;
    const id = typeof input.id === 'string' ? input.id.trim() : '';
    const fullName = typeof input.fullName === 'string' ? input.fullName.trim() : '';
    const emailInput = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const phone = typeof input.phone === 'string' ? input.phone.trim() : '';
    const email = emailInput || null;
    if (!id || id.length > 150 || !fullName || fullName.length > 160 ||
        (email !== null && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180)) ||
        !/^[+\d()\s-]{7,25}$/.test(phone)) {
      return NextResponse.json({ success: false, error: 'Enter a valid Parent name, email (optional), and phone' }, { status: 400, headers: noStore });
    }

    const scope: Prisma.ParentWhereInput = isSuperAdmin(session) ? { id } : {
      id, students: { some: { status: 'ACTIVE', class: { is: { teacherId: session.user.id } } } }
    };
    const existing = await prisma.parent.findFirst({ where: scope, select: { id: true, email: true } });
    if (!existing) return NextResponse.json({ success: false, error: 'Parent not found in your assigned class' }, { status: 404, headers: noStore });
    const previousEmail = normalizeEmail(existing.email);
    const nextEmail = normalizeEmail(email);
    if (previousEmail !== nextEmail && input.confirmEmailChange !== true) {
      return NextResponse.json({ success: false, error: 'Confirm the email change because it may affect parent sign-in and school notices.' }, { status: 400, headers: noStore });
    }

    const parent = await prisma.parent.update({ where: { id }, data: { fullName, email, phone },
      select: { id: true, fullName: true, email: true, phone: true,
        students: { where: isClassTeacher(session) ? { status: 'ACTIVE', class: { is: { teacherId: session.user.id } } } : undefined,
          select: { id: true, firstName: true, lastName: true, class: { select: { name: true } } } }
      } });
    return NextResponse.json({ success: true, data: parent }, { headers: noStore });
  } catch (error) {
    console.error('Update parent error:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ success: false, error: 'Failed to update Parent details' }, { status: 500, headers: noStore });
  }
}

// Parent deletion remains super-admin-only; no teacher action deletes accounts.
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!isSuperAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Super admin required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Parent ID required' }, { status: 400 });

    const parent = await prisma.parent.findUnique({ where: { id }, include: { students: true } });
    if (!parent) return NextResponse.json({ success: false, error: 'Parent not found' }, { status: 404 });

    if (parent.students.length > 0) {
      await prisma.student.updateMany({ where: { parentId: id }, data: { parentId: null } });
    }
    await prisma.ticket.deleteMany({ where: { parentId: id } });
    await prisma.conversation.deleteMany({ where: { parentId: id } });
    await prisma.sMSNotification.deleteMany({ where: { parentId: id } });
    await prisma.parent.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Parent deleted successfully' });
  } catch (error) {
    console.error('Delete parent error:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ success: false, error: 'Failed to delete parent' }, { status: 500 });
  }
}
