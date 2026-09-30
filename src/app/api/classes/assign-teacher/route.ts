import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isSuperAdmin } from "@/lib/permissions";

export async function PATCH(req: Request) {
  try {
    if (!isSuperAdmin(await auth())) return NextResponse.json({ success: false, error: 'Super admin required' }, { status: 403 });
    const body = await req.json();
    const { classId, teacherId } = body;

    if (!classId || !teacherId) {
      return NextResponse.json({ success: false, error: "Class ID and Teacher ID required" }, { status: 400 });
    }

    const teacher = await prisma.staff.findUnique({ where: { id: teacherId }, select: { status: true, role: true } });
    if (!teacher || teacher.status !== 'ACTIVE' || !['TEACHER', 'ACCOUNTANT_TEACHER'].includes(teacher.role)) {
      return NextResponse.json({ success: false, error: 'Choose an active teacher' }, { status: 400 });
    }

    const updatedClass = await prisma.class.update({
      where: { id: classId },
      data: { teacherId: teacherId }
    });

    return NextResponse.json({ success: true, data: updatedClass });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to assign teacher" }, { status: 500 });
  }
}
