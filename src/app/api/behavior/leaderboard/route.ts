import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET: Fetch behavioral leaderboard
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const term = searchParams.get('term');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get all students with their behavior records
    const students = await prisma.student.findMany({
      where: { status: 'ACTIVE' },
      include: {
        class: { select: { name: true } },
        behaviorRecords: term ? { where: { term } } : true
      }
    });

    // Calculate points for each student
    const leaderboard = students.map(student => {
      const meritPoints = student.behaviorRecords
        .filter(r => r.type === 'MERIT')
        .reduce((sum, r) => sum + r.points, 0);
      
      const demeritPoints = student.behaviorRecords
        .filter(r => r.type === 'DEMERIT')
        .reduce((sum, r) => sum + Math.abs(r.points), 0);

      const netPoints = meritPoints - demeritPoints;

      // Get badges
      const badges = student.badges ? student.badges.split(',').filter(b => b) : [];

      return {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        imageUrl: student.imageUrl,
        className: student.class?.name || 'Unassigned',
        meritPoints,
        demeritPoints,
        netPoints,
        badges,
        totalRecords: student.behaviorRecords.length
      };
    });

    // Sort by net points (descending) and take top N
    const sortedLeaderboard = leaderboard
      .sort((a, b) => b.netPoints - a.netPoints)
      .slice(0, limit);

    return NextResponse.json({ success: true, data: sortedLeaderboard });
  } catch (error) {
    console.error('Behavior leaderboard error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
