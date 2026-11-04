import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isSuperAdmin } from "@/lib/permissions";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const includeTeacher = !!req?.url && new URL(req.url).searchParams.get('includeTeacher') === '1';
    let classes;
    if (includeTeacher) {
      const session = await auth();
      if (!session?.user || !['ADMIN', 'STAFF'].includes(session.user.role)) {
        return NextResponse.json({ success: false, error: 'Staff access required' }, { status: 403 });
      }
      classes = await prisma.class.findMany({
        include: { teacher: { select: { id: true, firstName: true, lastName: true, role: true, status: true } } },
        orderBy: { name: 'asc' }
      });
    } else {
      classes = await prisma.class.findMany({ orderBy: { name: 'asc' } });
    }

    // To prevent Vercel caching issues with aggregate count sub-queries, 
    // we fetch the counts manually and attach them.
    const classIds = classes.map(c => c.id);
    const studentCounts = await prisma.student.groupBy({
      by: ['classId'],
      where: { classId: { in: classIds }, status: 'ACTIVE' },
      _count: { id: true }
    });

    const countMap: Record<string, number> = {};
    studentCounts.forEach(sc => {
      if (sc.classId) countMap[sc.classId] = sc._count.id;
    });

    const sanitizedClasses = classes.map(c => ({
      ...c,
      _count: { students: countMap[c.id] || 0 }
    }));

    return NextResponse.json({ success: true, data: sanitizedClasses });
  } catch (error: unknown) {
    console.error('GET Classes Error:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch classes' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!isSuperAdmin(await auth())) return NextResponse.json({ success: false, error: 'Super admin required' }, { status: 403 });
    const body = await req.json();
    const { name, level } = body;

    const newClass = await prisma.class.create({
      data: { name, level }
    });

    return NextResponse.json({ success: true, data: newClass }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to create class. It may already exist." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!isSuperAdmin(await auth())) return NextResponse.json({ success: false, error: 'Super admin required' }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });

    await prisma.class.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete class. It may have students attached." }, { status: 500 });
  }
}
