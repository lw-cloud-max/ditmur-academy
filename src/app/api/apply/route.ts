import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reference, firstName, lastName, dob, gender, previousSchool, parentName, email, phone } = body;

    if (!reference || !firstName || !lastName || !email) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Verify Paystack
    let isSuccessful = false;
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY || "mock";
    if (paystackSecret !== "mock") {
      const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${paystackSecret}` }
      });
      const verifyData = await verifyRes.json();
      if (verifyData.data?.status === 'success') isSuccessful = true;
    } else {
      isSuccessful = true;
    }

    if (!isSuccessful) {
      return NextResponse.json({ success: false, error: 'Payment verification failed' }, { status: 400 });
    }

    // Generate Custom ID like APP/2026/001
    const count = await prisma.application.count();
    const year = new Date().getFullYear();
    const formattedNumber = (count + 1).toString().padStart(3, '0');
    const newAppId = `APP/${year}/${formattedNumber}`;

    // Save Application
    const app = await prisma.application.create({
      data: {
        id: newAppId,
        firstName, 
        lastName, 
        dob: new Date(dob), 
        gender, 
        previousSchool, 
        parentName, 
        email, 
        phone, 
        paymentReference: reference, 
        status: 'PAID'
      }
    });

    return NextResponse.json({ success: true, data: app });
  } catch(err) {
    console.error(err);
    return NextResponse.json({ success: false, error: 'Server error during application submission' }, { status: 500 });
  }
}
