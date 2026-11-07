import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkPassword, hashPassword, validateNewPassword } from '@/lib/passwords';
import { normalizeEmail } from '@/lib/normalize-email';
import { passwordResetTokenMatchesEmail, verifyPasswordResetToken } from '@/lib/password-reset-token';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'private, no-store, max-age=0' };
const invalidMessage = 'This password-reset link is invalid, expired, or has already been used. Request a new one and try again.';

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({ success: false, error: 'Request origin not allowed' }, { status: 403, headers: noStore });

    const raw: unknown = await request.json().catch(() => null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return NextResponse.json({ success: false, error: 'Enter a new password and use the link from your email.' }, { status: 400, headers: noStore });
    }
    const body = raw as Record<string, unknown>;
    if (typeof body.newPassword !== 'string' || typeof body.token !== 'string' || body.token.length > 2048) {
      return NextResponse.json({ success: false, error: 'Enter a new password and use the link from your email.' }, { status: 400, headers: noStore });
    }

    const payload = verifyPasswordResetToken(body.token);
    if (!payload) return NextResponse.json({ success: false, error: invalidMessage }, { status: 400, headers: noStore });

    const email = payload.kind === 'STAFF'
      ? (await prisma.staff.findUnique({ where: { id: payload.id }, select: { id: true, email: true, status: true, passwordHash: true, sessionVersion: true } }))
      : (await prisma.parent.findUnique({ where: { id: payload.id }, select: { id: true, email: true, password: true, sessionVersion: true } }));

    if (!email || !email.email ||
        (payload.kind === 'STAFF' && 'status' in email && email.status !== 'ACTIVE') ||
        email.sessionVersion !== payload.sessionVersion ||
        !passwordResetTokenMatchesEmail(payload, email.email)) {
      return NextResponse.json({ success: false, error: invalidMessage }, { status: 400, headers: noStore });
    }

    const normalizedEmail = normalizeEmail(email.email);
    if (!normalizedEmail || normalizedEmail === 'admin@ditmur.com') {
      return NextResponse.json({ success: false, error: invalidMessage }, { status: 400, headers: noStore });
    }

    const problem = validateNewPassword(body.newPassword);
    if (problem) return NextResponse.json({ success: false, error: problem }, { status: 400, headers: noStore });

    const existingPassword = payload.kind === 'STAFF'
      ? ('passwordHash' in email ? email.passwordHash : null)
      : ('password' in email ? email.password : null);
    if (existingPassword) {
      const sameAsCurrent = await checkPassword(existingPassword, body.newPassword);
      if (sameAsCurrent.valid) return NextResponse.json({ success: false, error: 'Choose a password different from your current password.' }, { status: 400, headers: noStore });
    }

    const passwordHash = await hashPassword(body.newPassword);
    const update = payload.kind === 'STAFF'
      ? await prisma.staff.updateMany({
          where: { id: payload.id, email: email.email, status: 'ACTIVE', sessionVersion: payload.sessionVersion },
          data: { passwordHash, mustChangePassword: false, sessionVersion: { increment: 1 } }
        })
      : await prisma.parent.updateMany({
          where: { id: payload.id, email: email.email, sessionVersion: payload.sessionVersion },
          data: { password: passwordHash, mustChangePassword: false, sessionVersion: { increment: 1 } }
        });

    if (update.count !== 1) return NextResponse.json({ success: false, error: invalidMessage }, { status: 400, headers: noStore });
    return NextResponse.json({ success: true, message: 'Password reset successfully. Sign in with your new password.' }, { headers: noStore });
  } catch (error) {
    console.error('Password reset failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ success: false, error: 'Could not reset the password. Request a new link or contact a school administrator.' }, { status: 500, headers: noStore });
  }
}
