import { NextResponse } from 'next/server';
import { findUniqueStaffOrParentByEmail } from '@/lib/email-account-lookup';
import { normalizeEmail } from '@/lib/normalize-email';
import { allowPasswordResetRequest } from '@/lib/password-reset-rate-limit';
import { createPasswordResetToken, passwordResetIdempotencyKey } from '@/lib/password-reset-token';
import { getResendMailConfig, sendResendEmail } from '@/lib/resend-mail';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'private, no-store, max-age=0' };
const genericMessage = 'If a matching eligible staff or parent account exists, reset instructions will be sent shortly.';
const unavailableMessage = 'Password reset is temporarily unavailable. Please contact a school administrator.';
const PUBLIC_APP_ORIGIN = 'https://www.ditmuracademy.com';

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}

function getClientIp(request: Request): string {
  return request.headers.get('x-real-ip')?.trim() ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({ success: false, error: 'Request origin not allowed' }, { status: 403, headers: noStore });

    const raw: unknown = await request.json().catch(() => null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return NextResponse.json({ success: false, error: 'Enter a valid email address.' }, { status: 400, headers: noStore });
    }
    const email = normalizeEmail((raw as Record<string, unknown>).email);
    if (!email) return NextResponse.json({ success: false, error: 'Enter a valid email address.' }, { status: 400, headers: noStore });

    const mailConfig = getResendMailConfig();
    if (!mailConfig.testEnabled || !mailConfig.from || !process.env.AUTH_SECRET || process.env.AUTH_SECRET.trim().length < 32) {
      return NextResponse.json({ success: false, error: unavailableMessage }, { status: 503, headers: noStore });
    }

    if (!allowPasswordResetRequest(getClientIp(request), email)) {
      return NextResponse.json({ success: false, error: 'Please wait a little before requesting another reset email.' }, { status: 429, headers: noStore });
    }

    const account = await findUniqueStaffOrParentByEmail(email);
    if (!account) return NextResponse.json({ success: true, message: genericMessage }, { headers: noStore });

    const token = createPasswordResetToken({
      kind: account.kind,
      id: account.id,
      email: account.email,
      sessionVersion: account.sessionVersion
    });
    if (!token) return NextResponse.json({ success: false, error: unavailableMessage }, { status: 503, headers: noStore });

    // The token is in the URL fragment, so browsers do not send it to the app
    // server in page requests or ordinary referrer headers. The form posts it
    // to the reset endpoint in the request body.
    const resetUrl = `${PUBLIC_APP_ORIGIN}/reset-password#token=${encodeURIComponent(token)}`;
    const result = await sendResendEmail({
      from: mailConfig.from,
      to: [account.email],
      subject: 'Reset your Ditmur Academy password',
      text: [
        'A password reset was requested for your Ditmur Academy account.',
        '',
        'Use this secure link to choose a new password. It expires within 30 minutes and can be used only once:',
        resetUrl,
        '',
        'If you did not request this, ignore this email. Your password has not been changed.',
        '',
        'Ditmur Academy',
        'Cultivating Excellence and Discipline.'
      ].join('\n'),
      ...(mailConfig.replyTo ? { reply_to: mailConfig.replyTo } : {})
    }, passwordResetIdempotencyKey(token));

    if (!result.success) {
      // Do not log the target address or bearer token. The response remains
      // generic so the endpoint cannot be used to enumerate school accounts.
      console.warn('Password reset email was not accepted by Resend:', result.status);
    }
    return NextResponse.json({ success: true, message: genericMessage }, { headers: noStore });
  } catch (error) {
    console.error('Password reset request failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ success: false, error: unavailableMessage }, { status: 503, headers: noStore });
  }
}
