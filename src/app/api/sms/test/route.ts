import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isSuperAdmin } from '@/lib/permissions';
import { formatNigeriaPhone, getSMSConfig, sendSMS } from '@/lib/africastalking';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store, max-age=0' };
const TEST_MESSAGE = 'Ditmur Academy SMS connection test. Please ignore this message.';
const recentTestByAdmin = new Map<string, number>();

// One explicit test to a number entered by the super admin. It is deliberately
// not attached to a student/parent record and is never retried automatically.
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!isSuperAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Super admin required' }, { status: 403, headers: noStore });
    }
    const origin = req.headers.get('origin');
    if (origin && new URL(origin).host !== new URL(req.url).host) {
      return NextResponse.json({ success: false, error: 'Request origin not allowed' }, { status: 403, headers: noStore });
    }

    const config = getSMSConfig();
    if (!config.enabled) {
      return NextResponse.json({ success: false, error: config.reason }, { status: 503, headers: noStore });
    }
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: 'Invalid SMS test request' }, { status: 400, headers: noStore });
    }
    const input = body as Record<string, unknown>;
    if (input.confirmed !== true || input.consent !== true) {
      return NextResponse.json({ success: false, error: 'Explicit confirmation and recipient consent are required' }, { status: 400, headers: noStore });
    }
    if (typeof input.to !== 'string' || input.to.length > 32) {
      return NextResponse.json({ success: false, error: 'Enter a valid Nigerian mobile number' }, { status: 400, headers: noStore });
    }
    const to = formatNigeriaPhone(input.to);
    if (!to) return NextResponse.json({ success: false, error: 'Enter a valid Nigerian mobile number' }, { status: 400, headers: noStore });

    const adminId = session!.user!.id;
    const now = Date.now();
    const lastTest = recentTestByAdmin.get(adminId) || 0;
    if (now - lastTest < 60_000) {
      return NextResponse.json({ success: false, error: 'A test was just attempted. Check the provider dashboard before trying again.' }, { status: 429, headers: noStore });
    }
    recentTestByAdmin.set(adminId, now);

    const result = await sendSMS({ to, message: TEST_MESSAGE });
    if (!result.success) {
      return NextResponse.json({ success: false, status: result.status, error: result.error || 'SMS was not accepted. Check provider logs before retrying.' }, { status: 502, headers: noStore });
    }
    return NextResponse.json({
      success: true,
      data: { status: 'ACCEPTED', messageId: result.messageId || null },
      message: config.mode === 'sandbox'
        ? 'Accepted by the simulator; no real SMS was sent.'
        : 'Accepted by Africa’s Talking. Phone delivery is not confirmed; check the provider delivery report.'
    }, { headers: noStore });
  } catch (error) {
    console.error('SMS test failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ success: false, status: 'UNKNOWN', error: 'SMS outcome may be unknown. Check Africa’s Talking logs before retrying.' }, { status: 500, headers: noStore });
  }
}
