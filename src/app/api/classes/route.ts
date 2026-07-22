import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const classes = await prisma.class.findMany({
      orderBy: { name: 'asc' }
    });

    // To prevent Vercel caching issues with aggregate count sub-queries, 
    // we fetch the counts manually and attach them.
    const classIds = classes.map(c => c.id);
    const studentCounts = await prisma.student.groupBy({
      by: ['classId'],
      where: { classId: { in: classIds } },
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
  } catch (error: any) {
    console.error("GET Classes Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch classes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, level } = body;

    const newClass = await prisma.class.create({
      data: { name, level }
    });

    return NextResponse.json({ success: true, data: newClass }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to create class. It may already exist." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });

    await prisma.class.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to delete class. It may have students attached." }, { status: 500 });
  }
}
