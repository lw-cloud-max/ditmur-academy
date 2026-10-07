import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isSuperAdmin } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store, max-age=0' };
export async function GET() {
  if (!isSuperAdmin(await auth())) return NextResponse.json({ error: 'Super admin required' }, { status: 403, headers });
  try {
    const [parents, students] = await Promise.all([
      prisma.parent.findMany({ select: { id: true, fullName: true, email: true, phone: true,
        students: { select: { id: true } } } }),
      prisma.student.findMany({ select: { id: true, firstName: true, lastName: true, otherNames: true,
        parentId: true, class: { select: { name: true } } } })
    ]);
    return NextResponse.json({ parents, students }, { headers });
  } catch {
    return NextResponse.json({ error: 'Unable to load matching data' }, { status: 500, headers });
  }
}
const readOnly = () => NextResponse.json({ error: 'Preview only. Changes are disabled.' }, { status: 405, headers });
export const POST = readOnly;
export const PUT = readOnly;
export const PATCH = readOnly;
export const DELETE = readOnly;
