import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const staff = await prisma.staff.findMany({
      orderBy: { lastName: 'asc' },
      include: {
        classes: true
      }
    });
    return NextResponse.json({ success: true, data: staff });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch staff" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, phone, role } = body;

    // Generate Staff ID (e.g. DIT/STF/001)
    const count = await prisma.staff.count();
    const formattedNumber = (count + 1).toString().padStart(3, '0');
    const newId = `DIT/STF/${formattedNumber}`;

    const newStaff = await prisma.staff.create({
      data: {
        id: newId,
        firstName,
        lastName,
        email,
        phone,
        role
      }
    });

    return NextResponse.json({ success: true, data: newStaff }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to create staff member" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });

    await prisma.staff.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to delete staff member." }, { status: 500 });
  }
}
