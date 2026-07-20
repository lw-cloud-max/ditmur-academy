import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const classes = await prisma.class.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { students: true }
        }
      }
    });
    return NextResponse.json({ success: true, data: classes });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch classes" }, { status: 500 });
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
