import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isSuperAdmin } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// Only the super admin may withdraw an active pupil. Keep the record and
// every academic, finance, attendance and communications relation intact.
export async function PATCH(req: Request) {
  if (!isSuperAdmin(await auth())) {
    return NextResponse.json({ success: false, error: 'Super admin required' }, { status: 403 });
  }
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    }
    const { id, action, confirmed } = body as Record<string, unknown>;
    if (typeof id !== 'string' || !id.trim() || id.length > 150 || action !== 'MARK_INACTIVE' || confirmed !== true) {
      return NextResponse.json({ success: false, error: 'Confirm one active Student to mark inactive' }, { status: 400 });
    }
    const result = await prisma.student.updateMany({
      where: { id: id.trim(), status: 'ACTIVE' },
      data: { status: 'INACTIVE', sessionVersion: { increment: 1 } }
    });
    if (result.count !== 1) {
      return NextResponse.json({ success: false, error: 'Active Student not found or already inactive' }, { status: 409 });
    }
    return NextResponse.json({ success: true, data: { id: id.trim(), status: 'INACTIVE' },
      message: 'Student marked inactive. Their academic and payment history was retained.' },
      { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Mark inactive Student failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ success: false, error: 'Could not mark Student inactive. Check their status before retrying.' }, { status: 500 });
  }
}
