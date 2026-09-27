import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { isSuperAdmin } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
const allowedRoles = ['TEACHER', 'ADMIN', 'ACCOUNTANT', 'SUPPORT'];

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const role = new URL(req.url).searchParams.get('role');
    const staff = await prisma.staff.findMany({
      where: { status: 'ACTIVE', ...(role && allowedRoles.includes(role) ? { role } : {}) },
      select: {
        id: true, firstName: true, lastName: true, role: true,
        // Staff contact details should not be sent to students/parents.
        ...(isSuperAdmin(session) ? { email: true, phone: true, classes: { select: { id: true, name: true } } } : {})
      },
      orderBy: { firstName: 'asc' }
    });
    return NextResponse.json({ success: true, data: staff });
  } catch (error) {
    console.error('Fetch staff error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch staff' }, { status: 500 });
  }
}

// Staff directory only. Individual staff authentication will be a separate
// migration: never imply that creating a directory record gives login access.
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!isSuperAdmin(session)) return NextResponse.json({ success: false, error: 'Only the super admin can add staff' }, { status: 403 });
    const body = await req.json();
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const role = typeof body.role === 'string' ? body.role.toUpperCase() : '';
    if (!firstName || !lastName || firstName.length > 80 || lastName.length > 80 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180 ||
        !/^[+\d()\s-]{7,25}$/.test(phone) || !allowedRoles.includes(role)) {
      return NextResponse.json({ success: false, error: 'Enter valid names, email, phone and role' }, { status: 400 });
    }
    const existing = await prisma.staff.findUnique({ where: { email }, select: { id: true, status: true } });
    if (existing?.status === 'ACTIVE') return NextResponse.json({ success: false, error: 'A staff record already uses this email' }, { status: 409 });
    const staff = existing
      ? await prisma.staff.update({
          where: { id: existing.id }, data: { firstName, lastName, phone, role, status: 'ACTIVE' },
          select: { id: true, firstName: true, lastName: true, role: true, email: true, phone: true }
        })
      : await prisma.staff.create({
          data: { id: `STF-${randomBytes(8).toString('hex').toUpperCase()}`, firstName, lastName, email, phone, role, status: 'ACTIVE' },
          select: { id: true, firstName: true, lastName: true, role: true, email: true, phone: true }
        });
    return NextResponse.json({ success: true, data: staff }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create staff error:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'A staff member with this email or ID already exists' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: 'Failed to create staff. Please try again.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!isSuperAdmin(session)) return NextResponse.json({ success: false, error: 'Only the super admin can remove staff' }, { status: 403 });
    const id = new URL(req.url).searchParams.get('id');
    if (!id || id === 'admin-1') return NextResponse.json({ success: false, error: 'Valid staff ID required' }, { status: 400 });
    // Preserve historic lesson notes, exams and attendance references.
    await prisma.staff.update({ where: { id }, data: { status: 'INACTIVE' } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Deactivate staff error:', error);
    return NextResponse.json({ success: false, error: 'Could not remove staff' }, { status: 500 });
  }
}
