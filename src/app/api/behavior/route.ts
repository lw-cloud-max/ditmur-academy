import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

// POST: Award merit or demerit points
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'STAFF')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { studentId, type, points, category, title, description, term } = await req.json();

    if (!studentId || !type || !points || !category || !title || !term) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Validate type
    if (type !== 'MERIT' && type !== 'DEMERIT') {
      return NextResponse.json({ success: false, error: 'Type must be MERIT or DEMERIT' }, { status: 400 });
    }

    // Validate points
    const pointsValue = type === 'MERIT' ? Math.abs(points) : -Math.abs(points);

    // Create behavior record
    const record = await prisma.behaviorRecord.create({
      data: {
        studentId,
        type,
        points: pointsValue,
        category,
        title,
        description,
        awardedBy: session.user.id,
        term
      },
      include: {
        student: { select: { firstName: true, lastName: true, class: { select: { name: true } } } }
      }
    });

    // Update student badges
    await updateStudentBadges(studentId);

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    console.error('Behavior record error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create behavior record' }, { status: 500 });
  }
}

// GET: Fetch behavior records
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const term = searchParams.get('term');
    const type = searchParams.get('type');
    const category = searchParams.get('category');

    const whereClause: any = {};
    if (studentId) whereClause.studentId = studentId;
    if (term) whereClause.term = term;
    if (type) whereClause.type = type;
    if (category) whereClause.category = category;

    const records = await prisma.behaviorRecord.findMany({
      where: whereClause,
      include: {
        student: { select: { id: true, firstName: true, lastName: true, class: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate totals
    const totalMerit = records.filter(r => r.type === 'MERIT').reduce((sum, r) => sum + r.points, 0);
    const totalDemerit = records.filter(r => r.type === 'DEMERIT').reduce((sum, r) => sum + Math.abs(r.points), 0);
    const netPoints = totalMerit - totalDemerit;

    return NextResponse.json({ 
      success: true, 
      data: records,
      summary: { totalMerit, totalDemerit, netPoints }
    });
  } catch (error) {
    console.error('Fetch behavior records error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch behavior records' }, { status: 500 });
  }
}

// Helper function to update student badges based on behavior points
async function updateStudentBadges(studentId: string) {
  try {
    const records = await prisma.behaviorRecord.findMany({
      where: { studentId }
    });

    const totalMerit = records.filter(r => r.type === 'MERIT').reduce((sum, r) => sum + r.points, 0);
    
    const badges: string[] = [];

    // Award badges based on merit points
    if (totalMerit >= 100) badges.push('Gold Scholar');
    if (totalMerit >= 50) badges.push('Silver Star');
    if (totalMerit >= 25) badges.push('Bronze Achiever');
    if (totalMerit >= 10) badges.push('Rising Star');

    // Category-specific badges
    const academicMerit = records.filter(r => r.type === 'MERIT' && r.category === 'ACADEMIC').reduce((sum, r) => sum + r.points, 0);
    const disciplineMerit = records.filter(r => r.type === 'MERIT' && r.category === 'DISCIPLINE').reduce((sum, r) => sum + r.points, 0);
    const leadershipMerit = records.filter(r => r.type === 'MERIT' && r.category === 'LEADERSHIP').reduce((sum, r) => sum + r.points, 0);

    if (academicMerit >= 30) badges.push('Academic Excellence');
    if (disciplineMerit >= 30) badges.push('Discipline Champion');
    if (leadershipMerit >= 30) badges.push('Leadership Award');

    // Update student badges
    await prisma.student.update({
      where: { id: studentId },
      data: { badges: badges.join(',') }
    });
  } catch (error) {
    console.error('Update badges error:', error);
  }
}
