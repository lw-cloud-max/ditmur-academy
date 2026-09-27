import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { canViewSchoolFinance } from '@/lib/permissions';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { reference, invoiceId } = await req.json();
    if (typeof reference !== 'string' || !/^[\w-]{5,120}$/.test(reference) || typeof invoiceId !== 'string' || !invoiceId) {
      return NextResponse.json({ success: false, error: 'Valid reference and invoice ID required' }, { status: 400 });
    }
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }, select: { id: true, amount: true, status: true, studentId: true, student: { select: { parentId: true } } }
    });
    if (!invoice) return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    const role = session.user.role;
    if (!canViewSchoolFinance(session) &&
        !(role === 'PARENT' && invoice.student.parentId === session.user.id) &&
        !(role === 'STUDENT' && invoice.studentId === session.user.id)) {
      return NextResponse.json({ success: false, error: 'Invoice not available' }, { status: 403 });
    }
    if (invoice.status === 'PAID') return NextResponse.json({ success: false, error: 'Invoice is already paid' }, { status: 409 });
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return NextResponse.json({ success: false, error: 'Online payment verification is not configured' }, { status: 503 });
    const verify = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` }, cache: 'no-store'
    });
    if (!verify.ok) return NextResponse.json({ success: false, error: 'Could not verify payment with Paystack' }, { status: 502 });
    const result = await verify.json();
    const paid = result?.status === true && result?.data?.status === 'success' &&
      result?.data?.reference === reference && result?.data?.currency === 'NGN' &&
      Number(result?.data?.amount) === Math.round(invoice.amount * 100);
    if (!paid) return NextResponse.json({ success: false, error: 'Payment reference does not match this invoice' }, { status: 400 });
    const updated = await prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'PAID', paidDate: new Date() } });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ success: false, error: 'Payment verification failed' }, { status: 500 });
  }
}
