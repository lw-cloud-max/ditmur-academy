import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isSuperAdmin } from '@/lib/permissions';
import { getResendMailConfig } from '@/lib/resend-mail';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store, max-age=0' };

export async function GET() {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ success: false, error: 'Super admin required' }, { status: 403, headers: noStore });
  const { testEnabled, newsletterEnabled, from, replyTo, reason } = getResendMailConfig();
  return NextResponse.json({ success: true, data: { testEnabled, newsletterEnabled, from, replyTo, reason } }, { headers: noStore });
}
