import { NextResponse } from 'next/server';

// Fail closed: the public application-payment flow has not been approved or
// verified. Never create a PAID application from an unverified reference.
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Online paid applications are unavailable. Please contact the school directly.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } }
  );
}
