import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { classId, teacherId } = body;

    if (!classId || !teacherId) {
      return NextResponse.json({ success: false, error: "Class ID and Teacher ID required" }, { status: 400 });
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
