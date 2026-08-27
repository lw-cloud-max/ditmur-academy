import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const students = await prisma.student.findMany({
      include: {
        grades: { include: { subject: true } },
        cbtResults: true,
        internalResults: true,
        behaviorRecords: true,
        class: true
      }
    });

    const studentStats = students.map((stu: any) => {
      // Calculate academic average
      let totalGradeScore = 0;
      let totalSubjects = 0;
      
      stu.grades.forEach((g: any) => {
        totalGradeScore += (g.total || 0);
        totalSubjects++;
      });

      const averageGrade = totalSubjects > 0 ? (totalGradeScore / totalSubjects) : 0;
      
      // Calculate CBT average
      let totalCbtScore = 0;
      let cbtCount = 0;
      
      stu.cbtResults.forEach((c: any) => { totalCbtScore += (c.score/c.totalMarks)*100; cbtCount++; });
      stu.internalResults.forEach((c: any) => { totalCbtScore += (c.score/c.totalMarks)*100; cbtCount++; });
      
      const averageCbt = cbtCount > 0 ? (totalCbtScore / cbtCount) : 0;

      // Calculate behavior points
      const meritPoints = stu.behaviorRecords
        .filter((r: any) => r.type === 'MERIT')
        .reduce((sum: number, r: any) => sum + r.points, 0);
      
      const demeritPoints = stu.behaviorRecords
        .filter((r: any) => r.type === 'DEMERIT')
        .reduce((sum: number, r: any) => sum + Math.abs(r.points), 0);

      const netBehaviorPoints = meritPoints - demeritPoints;

      // Calculate overall score (weighted)
      // Academic: 60%, CBT: 20%, Behavior: 20%
      const overallScore = (averageGrade * 0.6) + (averageCbt * 0.2) + (Math.max(0, netBehaviorPoints) * 0.2);

      // Generate badges
      const badges = [];
      
      // Academic badges
      if (averageGrade >= 90) badges.push({ name: 'Scholar', icon: 'Crown', color: 'text-yellow-600 bg-yellow-100' });
      if (averageGrade >= 80) badges.push({ name: 'Honor Roll', icon: 'Star', color: 'text-blue-600 bg-blue-100' });
      
      // CBT badges
      if (averageCbt >= 95) badges.push({ name: 'Speed Demon', icon: 'Zap', color: 'text-red-600 bg-red-100' });
      if (averageCbt >= 85) badges.push({ name: 'Quick Thinker', icon: 'Zap', color: 'text-orange-600 bg-orange-100' });
      
      // Subject-specific badges
      if (stu.grades.some((g: any) => g.subject?.name?.toLowerCase().includes('math') && g.total >= 90)) {
        badges.push({ name: 'Math Whiz', icon: 'Calculator', color: 'text-[#0033A0] bg-blue-100' });
      }
      
      // Behavior badges
      if (meritPoints >= 100) badges.push({ name: 'Gold Character', icon: 'Award', color: 'text-yellow-600 bg-yellow-100' });
      if (meritPoints >= 50) badges.push({ name: 'Silver Character', icon: 'Award', color: 'text-slate-600 bg-slate-100' });
      if (netBehaviorPoints >= 25) badges.push({ name: 'Discipline Star', icon: 'Shield', color: 'text-emerald-600 bg-emerald-100' });
      
      // Default badge
      if (badges.length === 0) badges.push({ name: 'Rising Star', icon: 'Star', color: 'text-purple-600 bg-purple-100' });

      return {
        id: stu.id,
        firstName: stu.firstName,
        lastName: stu.lastName,
        className: stu.class?.name || 'Unassigned',
        imageUrl: stu.imageUrl,
        averageGrade: parseFloat(averageGrade.toFixed(1)),
        averageCbt: parseFloat(averageCbt.toFixed(1)),
        meritPoints,
        demeritPoints,
        netBehaviorPoints,
        overallScore: parseFloat(overallScore.toFixed(1)),
        badges
      };
    });

    // Sort by overall score (combining academics and behavior)
    studentStats.sort((a, b) => b.overallScore - a.overallScore);
    const top10 = studentStats.slice(0, 10);

    return NextResponse.json({ success: true, data: top10 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch Hall of Fame' }, { status: 500 });
  }
}
