import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [
      totalStudents,
      activeClasses,
      totalStaff,
      totalRevenueData
    ] = await Promise.all([
      prisma.student.count(),
      prisma.class.count(),
      prisma.staff.count(),
      prisma.invoice.aggregate({
        _sum: { amount: true },
        where: { status: 'PAID' }
      })
    ]);

    const totalRevenue = totalRevenueData._sum.amount || 0;

    return NextResponse.json({
      success: true,
      data: {
        totalStudents,
        totalStaff,
        activeClasses,
        totalRevenue
      }
    });
  } catch (error) {
    console.error("Dashboard fetch error:", error);
    return NextResponse.json({ success: false, error: "Failed to load dashboard data" }, { status: 500 });
  }
}
