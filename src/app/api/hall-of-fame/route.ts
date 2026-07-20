import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const students = await prisma.student.findMany({
      include: {
        grades: { include: { subject: true } },
        cbtResults: true,
        internalResults: true,
        class: true
      }
    });

    const studentStats = students.map((stu: any) => {
      let totalGradeScore = 0;
      let totalSubjects = 0;
      
      stu.grades.forEach((g: any) => {
        totalGradeScore += (g.total || 0);
        totalSubjects++;
      });

      const averageGrade = totalSubjects > 0 ? (totalGradeScore / totalSubjects) : 0;
      
      let totalCbtScore = 0;
      let cbtCount = 0;
      
      stu.cbtResults.forEach((c: any) => { totalCbtScore += (c.score/c.totalMarks)*100; cbtCount++; });
      stu.internalResults.forEach((c: any) => { totalCbtScore += (c.score/c.totalMarks)*100; cbtCount++; });
      
      const averageCbt = cbtCount > 0 ? (totalCbtScore / cbtCount) : 0;

      const badges = [];
      if (averageGrade >= 90) badges.push({ name: 'Scholar', icon: 'Crown', color: 'text-yellow-600 bg-yellow-100' });
      if (averageCbt >= 95) badges.push({ name: 'Speed Demon', icon: 'Zap', color: 'text-red-600 bg-red-100' });
      if (stu.grades.some((g: any) => g.subject?.name?.toLowerCase().includes('math') && g.total >= 90)) {
        badges.push({ name: 'Math Whiz', icon: 'Calculator', color: 'text-[#0033A0] bg-blue-100' });
      }

      if (badges.length === 0) badges.push({ name: 'Rising Star', icon: 'Star', color: 'text-purple-600 bg-purple-100' });

      return {
        id: stu.id,
        firstName: stu.firstName,
        lastName: stu.lastName,
        className: stu.class?.name || 'Unassigned',
        imageUrl: stu.imageUrl,
        averageGrade: parseFloat(averageGrade.toFixed(1)),
        badges
      };
    });

    studentStats.sort((a, b) => b.averageGrade - a.averageGrade);
    const top10 = studentStats.slice(0, 10);

    return NextResponse.json({ success: true, data: top10 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch Hall of Fame' }, { status: 500 });
  }
}
