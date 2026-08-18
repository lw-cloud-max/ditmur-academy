import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { name: 'asc' }
    });
    return NextResponse.json({ success: true, data: subjects });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch subjects" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name ?? '').trim();

    if (!name) {
      return NextResponse.json({ success: false, error: "Subject name is required." }, { status: 400 });
    }

    const normalizedName = name.toLowerCase();
    const existingSubject = await prisma.subject.findFirst({
      where: {
        name: {
          equals: name,
        }
      }
    });

    const duplicateSubject = existingSubject || (await prisma.subject.findMany()).find(s => s.name.toLowerCase() === normalizedName);

    if (duplicateSubject) {
      return NextResponse.json({ success: false, error: `Subject "${name}" already exists.` }, { status: 409 });
    }

    const newSubject = await prisma.subject.create({
      data: { name }
    });

    return NextResponse.json({ success: true, data: newSubject }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ success: false, error: "This subject already exists." }, { status: 409 });
    }

    console.error("Failed to create subject:", error);
    return NextResponse.json({ success: false, error: "Failed to create subject." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });

    await prisma.subject.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to delete subject." }, { status: 500 });
  }
}
