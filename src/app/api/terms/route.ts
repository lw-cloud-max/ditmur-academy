import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const terms = await prisma.academicTerm.findMany({
      orderBy: [
        { session: 'desc' },
        { name: 'asc' }
      ]
    });
    return NextResponse.json({ success: true, data: terms });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch terms' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, session, isCurrent, startDate, endDate } = body;

    // If setting as current, we must unset all other terms first
    if (isCurrent) {
      await prisma.academicTerm.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false }
      });
    }

    const term = await prisma.academicTerm.create({
      data: {
        name,
        session,
        isCurrent,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      }
    });

    return NextResponse.json({ success: true, data: term }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create term' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, isCurrent } = body;

    if (isCurrent) {
      // Unset others
      await prisma.academicTerm.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false }
      });
    }

    const updated = await prisma.academicTerm.update({
      where: { id },
      data: { isCurrent }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update term' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

    await prisma.academicTerm.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete term' }, { status: 500 });
  }
}
