import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { auth } from '@/auth';
import { isSuperAdmin } from '@/lib/permissions';
import { getResendMailConfig, isValidEmailAddress, sendResendEmail } from '@/lib/resend-mail';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store, max-age=0' };
const recentTestByAdmin = new Map<string, number>();
const TEST_SUBJECT = 'Ditmur Academy email connection test';
const TEST_TEXT = 'This is a test email from Ditmur Academy. Please ignore it. No student or parent information is included.\n\nCultivating Excellence and Discipline.';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!isSuperAdmin(session)) return NextResponse.json({ success: false, error: 'Super admin required' }, { status: 403, headers: noStore });
    const origin = req.headers.get('origin');
    if (origin && new URL(origin).host !== new URL(req.url).host) return NextResponse.json({ success: false, error: 'Request origin not allowed' }, { status: 403, headers: noStore });
    const config = getResendMailConfig();
    if (!config.testEnabled || !config.from) return NextResponse.json({ success: false, error: config.reason }, { status: 503, headers: noStore });
    const raw: unknown = await req.json();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return NextResponse.json({ success: false, error: 'Invalid email test request' }, { status: 400, headers: noStore });
    const body = raw as Record<string, unknown>;
    const to = typeof body.to === 'string' ? body.to.trim().toLowerCase() : '';
    if (!isValidEmailAddress(to) || body.consent !== true || body.confirmed !== true) {
      return NextResponse.json({ success: false, error: 'Enter a valid test email, confirm you control it or have permission, and explicitly confirm the send.' }, { status: 400, headers: noStore });
    }
    const adminId = session!.user!.id;
    const now = Date.now();
    const last = recentTestByAdmin.get(adminId) || 0;
    if (now - last < 60_000) return NextResponse.json({ success: false, error: 'A test was just attempted. Check Resend logs before trying again.' }, { status: 429, headers: noStore });
    recentTestByAdmin.set(adminId, now);

    const result = await sendResendEmail({
      from: config.from, to: [to], subject: TEST_SUBJECT, text: TEST_TEXT,
      ...(config.replyTo ? { reply_to: config.replyTo } : {})
    }, `ditmur-email-test-${randomUUID()}`);
    if (!result.success) return NextResponse.json({ success: false, status: result.status, error: result.error }, { status: 502, headers: noStore });
    return NextResponse.json({ success: true, data: { status: 'ACCEPTED', id: result.id },
      message: 'Accepted by Resend. Check the recipient inbox and Resend email logs; acceptance alone does not confirm delivery.' }, { headers: noStore });
  } catch (error) {
    console.error('Resend test email failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ success: false, status: 'UNKNOWN', error: 'Email outcome may be unknown. Check Resend logs before retrying.' }, { status: 500, headers: noStore });
  }
}
