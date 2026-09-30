import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { isSuperAdmin } from '@/lib/permissions';

export async function POST(req: Request) {
  try {
    if (!isSuperAdmin(await auth())) return NextResponse.json({ success: false, error: 'Super admin required' }, { status: 403 });
    const body = await req.json();
    const { studentIds, targetClassId } = body;

    if (!studentIds || !Array.isArray(studentIds) || !targetClassId) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    // Bulk update students to the new class
    await prisma.student.updateMany({
      where: { id: { in: studentIds } },
      data: { classId: targetClassId }
    });

    return NextResponse.json({ success: true, message: `Successfully promoted ${studentIds.length} students.` });
  } catch (error) {
    console.error("Failed to promote students:", error);
    return NextResponse.json({ success: false, error: 'Failed to promote students' }, { status: 500 });
  }
}
