import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');

    const whereCondition = classId ? { classId } : {};

    const students = await prisma.student.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      include: {
        parent: true,
        class: true
      }
    });

    return NextResponse.json({ success: true, data: students });
  } catch (error) {
    console.error("Failed to fetch students", error);
    return NextResponse.json({ success: false, error: 'Failed to fetch students' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, action, ...data } = body;

    if (!id) return NextResponse.json({ success: false, error: 'Student ID required' }, { status: 400 });

    if (action === 'update_student') {
      const updated = await prisma.student.update({
        where: { id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          dob: new Date(data.dob),
          gender: data.gender,
          status: data.status,
        }
      });
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === 'assign_class') {
      const updated = await prisma.student.update({
        where: { id },
        data: { classId: data.classId !== '' ? data.classId : null }
      });
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === 'link_parent') {
      let parent = null;
      if (data.email) {
        parent = await prisma.parent.findFirst({ where: { email: data.email }});
      }
      
      if (!parent) {
        parent = await prisma.parent.create({
          data: { fullName: data.parentName, email: data.email, phone: data.phone }
        });
      } else {
        parent = await prisma.parent.update({
          where: { id: parent.id },
          data: { fullName: data.parentName, phone: data.phone }
        });
      }

      const updated = await prisma.student.update({
        where: { id },
        data: { parentId: parent.id }
      });
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error("PATCH error:", error);
    return NextResponse.json({ success: false, error: 'Failed to update student' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: "Student ID required" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.grade.deleteMany({ where: { studentId: id } });
      await tx.invoice.deleteMany({ where: { studentId: id } });
      await tx.student.delete({ where: { id } });
    });

    return NextResponse.json({ success: true, message: "Student deleted successfully" });
  } catch (error) {
    console.error("Failed to delete student:", error);
    return NextResponse.json({ success: false, error: "Failed to delete student" }, { status: 500 });
  }
}
