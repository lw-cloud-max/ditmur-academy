import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const parents = await prisma.parent.findMany({
      orderBy: { fullName: 'asc' },
      include: {
        students: {
          include: {
            class: true
          }
        }
      }
    });

    return NextResponse.json({ success: true, data: parents });
  } catch (error) {
    console.error("Failed to fetch parents:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch parents" }, { status: 500 });
  }
}
