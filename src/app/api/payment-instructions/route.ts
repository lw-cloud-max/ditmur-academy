import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

// This endpoint serves the school account only to signed-in parents, never
// to the public landing page or unauthenticated requests.
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'PARENT') {
      return NextResponse.json({ success: false, error: 'Parent login required' }, { status: 403 });
    }
    const bankName = process.env.SCHOOL_BANK_NAME?.trim() || '';
    const accountName = process.env.SCHOOL_ACCOUNT_NAME?.trim() || '';
    const accountNumber = process.env.SCHOOL_ACCOUNT_NUMBER?.trim() || '';
    if (!bankName || !accountName || !/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json({ success: false, error: 'Bank transfer details are not configured yet. Contact the school office.' },
        { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
    }
    return NextResponse.json({ success: true, data: { bankName, accountName, accountNumber } },
      { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Bank instructions error:', error);
    return NextResponse.json({ success: false, error: 'Could not load school transfer details' }, { status: 500 });
  }
}
