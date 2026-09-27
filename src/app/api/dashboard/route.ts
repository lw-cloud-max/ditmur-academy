import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { canViewSchoolFinance } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

type Activity = { text: string; at: string; category: string };

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'STAFF', 'TEACHER', 'ACCOUNTANT'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    const finance = canViewSchoolFinance(session);
    const [totalStudents, activeClasses, totalStaff, students, staff, terms, invoices, revenue] = await Promise.all([
      prisma.student.count({ where: { status: 'ACTIVE' } }),
      prisma.class.count(),
      prisma.staff.count({ where: { status: 'ACTIVE' } }),
      prisma.student.findMany({ orderBy: { createdAt: 'desc' }, take: 4, select: { firstName: true, lastName: true, createdAt: true } }),
      prisma.staff.findMany({ orderBy: { createdAt: 'desc' }, take: 4, select: { firstName: true, lastName: true, createdAt: true } }),
      prisma.academicTerm.findMany({ orderBy: { createdAt: 'desc' }, take: 4, select: { name: true, session: true, createdAt: true } }),
      finance ? prisma.invoice.findMany({ orderBy: { createdAt: 'desc' }, take: 4, select: { createdAt: true, description: true } }) : Promise.resolve([]),
      finance ? prisma.invoice.aggregate({ _sum: { amount: true }, where: { status: 'PAID' } }) : Promise.resolve(null)
    ]);
    const activities: Activity[] = [
      ...students.map(s => ({ text: `Student enrolled: ${s.firstName} ${s.lastName}`, at: s.createdAt.toISOString(), category: 'student' })),
      ...staff.map(s => ({ text: `Staff added: ${s.firstName} ${s.lastName}`, at: s.createdAt.toISOString(), category: 'staff' })),
      ...terms.map(t => ({ text: `Academic term added: ${t.name} (${t.session})`, at: t.createdAt.toISOString(), category: 'term' })),
      ...invoices.map(i => ({ text: `Invoice created: ${i.description}`, at: i.createdAt.toISOString(), category: 'finance' }))
    ];
    activities.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return NextResponse.json({ success: true, data: {
      totalStudents, totalStaff, activeClasses, recentActivity: activities.slice(0, 6),
      ...(finance && revenue ? { totalRevenue: revenue._sum.amount || 0 } : {})
    } });
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load dashboard data' }, { status: 500 });
  }
}
