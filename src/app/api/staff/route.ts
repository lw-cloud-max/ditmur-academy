import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');

    const whereClause: any = { status: 'ACTIVE' };
    if (role) {
      whereClause.role = role;
    }

    const staff = await prisma.staff.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        email: true
      },
      orderBy: { firstName: 'asc' }
    });

    return NextResponse.json({ success: true, data: staff });
  } catch (error) {
    console.error('Fetch staff error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch staff' }, { status: 500 });
  }
}
