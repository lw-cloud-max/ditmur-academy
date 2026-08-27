import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

// GET: Fetch portfolio items
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const category = searchParams.get('category');

    const whereClause: any = {};
    if (studentId) whereClause.studentId = studentId;
    if (category) whereClause.category = category;

    const portfolios = await prisma.portfolio.findMany({
      where: whereClause,
      include: {
        student: { select: { id: true, firstName: true, lastName: true, class: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: portfolios });
  } catch (error) {
    console.error('Fetch portfolio error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch portfolio' }, { status: 500 });
  }
}

// POST: Create new portfolio item
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { studentId, title, description, category, fileUrl, imageUrl, isPublic, term } = await req.json();

    if (!studentId || !title || !category || !term) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const portfolio = await prisma.portfolio.create({
      data: {
        studentId,
        title,
        description,
        category,
        fileUrl,
        imageUrl,
        isPublic: isPublic !== false,
        term
      },
      include: {
        student: { select: { firstName: true, lastName: true } }
      }
    });

    return NextResponse.json({ success: true, data: portfolio }, { status: 201 });
  } catch (error) {
    console.error('Create portfolio error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create portfolio item' }, { status: 500 });
  }
}

// DELETE: Delete portfolio item
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Portfolio ID required' }, { status: 400 });
    }

    await prisma.portfolio.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Portfolio item deleted' });
  } catch (error) {
    console.error('Delete portfolio error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete portfolio item' }, { status: 500 });
  }
}
