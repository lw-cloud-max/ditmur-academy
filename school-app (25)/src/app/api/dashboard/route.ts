import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [
      totalStudents,
      activeClasses,
      totalRevenueData
    ] = await Promise.all([
      prisma.student.count(),
      prisma.class.count(),
      prisma.invoice.aggregate({
        _sum: { amount: true },
        where: { status: 'PAID' }
      })
    ]);

    // Right now we don't have a Staff table, so we'll mock total staff
    const totalStaff = 84;
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
