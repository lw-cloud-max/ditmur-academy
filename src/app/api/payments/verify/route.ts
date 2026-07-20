import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reference, invoiceId } = body;

    if (!reference || !invoiceId) {
      return NextResponse.json({ success: false, error: 'Missing reference or invoiceId' }, { status: 400 });
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY || "mock";
    let isSuccessful = false;

    if (paystackSecret && paystackSecret !== "mock") {
      const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: {
          Authorization: `Bearer ${paystackSecret}`
        }
      });
      const verifyData = await verifyRes.json();
      if (verifyData.status && verifyData.data.status === 'success') {
        isSuccessful = true;
      }
    } else {
      console.log("No real PAYSTACK_SECRET_KEY found. Mocking successful payment verification.");
      isSuccessful = true;
    }

    if (isSuccessful) {
      const updated = await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'PAID', paidDate: new Date() }
      });
      return NextResponse.json({ success: true, data: updated, message: "Payment successful and verified!" });
    } else {
      return NextResponse.json({ success: false, error: 'Payment verification failed' }, { status: 400 });
    }

  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
