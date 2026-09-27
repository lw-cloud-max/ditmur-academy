import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { canViewSchoolFinance } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const role = session.user.role;
    const finance = canViewSchoolFinance(session);
    if (!finance && role !== 'PARENT' && role !== 'STUDENT') {
      return NextResponse.json({ success: false, error: 'School finance is restricted' }, { status: 403 });
    }
    const status = new URL(req.url).searchParams.get('status');
    const invoices = await prisma.invoice.findMany({
      where: {
        ...(status && ['PAID', 'PENDING', 'OVERDUE'].includes(status) ? { status } : {}),
        ...(role === 'PARENT' ? { student: { parentId: session.user.id } } : {}),
        ...(role === 'STUDENT' ? { studentId: session.user.id } : {})
      },
      orderBy: { createdAt: 'desc' },
      include: { student: { select: { id: true, firstName: true, lastName: true, parentId: true } } }
    });
    return NextResponse.json({ success: true, data: invoices });
  } catch (error) {
    console.error('Fetch invoices error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!canViewSchoolFinance(await auth())) return NextResponse.json({ success: false, error: 'Finance access required' }, { status: 403 });
    const { studentId, description, amount, status = 'PENDING', dueDate } = await req.json();
    const number = Number(amount);
    if (typeof studentId !== 'string' || !studentId ||
        typeof description !== 'string' || !description.trim() || description.length > 250 ||
        !Number.isFinite(number) || number <= 0 ||
        !['PENDING', 'PAID', 'OVERDUE'].includes(status) ||
        typeof dueDate !== 'string' || !dueDate || Number.isNaN(Date.parse(dueDate))) {
      return NextResponse.json({ success: false, error: 'Valid student, description, amount and due date required' }, { status: 400 });
    }
    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
    if (!student) return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    const invoice = await prisma.invoice.create({
      data: {
        id: `INV-${new Date().getFullYear()}-${randomBytes(5).toString('hex').toUpperCase()}`,
        studentId, description: description.trim(), amount: number, status,
        dueDate: new Date(dueDate), paidDate: status === 'PAID' ? new Date() : null
      }
    });
    return NextResponse.json({ success: true, data: invoice }, { status: 201 });
  } catch (error) {
    console.error('Create invoice error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create invoice' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    if (!canViewSchoolFinance(await auth())) return NextResponse.json({ success: false, error: 'Finance access required' }, { status: 403 });
    const { invoiceId, status } = await req.json();
    if (typeof invoiceId !== 'string' || !invoiceId || !['PENDING', 'PAID', 'OVERDUE'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Valid invoice and status required' }, { status: 400 });
    }
    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status, paidDate: status === 'PAID' ? new Date() : null }
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update invoice error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update invoice' }, { status: 500 });
  }
}
