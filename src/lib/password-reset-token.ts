import { createHmac, createHash, timingSafeEqual } from 'crypto';
import { normalizeEmail } from '@/lib/normalize-email';

export const PASSWORD_RESET_WINDOW_MS = 15 * 60 * 1000;
export const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const TOKEN_ISSUER = 'ditmur-academy';
const TOKEN_PURPOSE = 'password-reset';

type ResetAccountKind = 'STAFF' | 'PARENT';
type PasswordResetPayload = {
  v: 1;
  iss: typeof TOKEN_ISSUER;
  purpose: typeof TOKEN_PURPOSE;
  kind: ResetAccountKind;
  id: string;
  sessionVersion: number;
  iat: number;
  exp: number;
  emailTag: string;
};

function secretValue(secret = process.env.AUTH_SECRET): string | null {
  const value = typeof secret === 'string' ? secret.trim() : '';
  return value.length >= 32 ? value : null;
}

function emailTag(email: unknown, secret: string): string | null {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return createHmac('sha256', secret).update(`ditmur-password-reset-email:${normalized}`).digest('base64url');
}

function signPayload(encodedPayload: string, secret: string): string {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

export function createPasswordResetToken(
  account: { kind: ResetAccountKind; id: string; email: string; sessionVersion: number },
  now = Date.now(),
  secretOverride?: string
): string | null {
  const secret = secretValue(secretOverride);
  const normalized = normalizeEmail(account.email);
  if (!secret || !normalized || !account.id || account.id.length > 128 ||
      !Number.isSafeInteger(account.sessionVersion) || account.sessionVersion < 0 ||
      !['STAFF', 'PARENT'].includes(account.kind)) return null;

  // A fixed 15-minute issuance window lets Resend's idempotency key suppress
  // repeated reset emails across serverless instances, without storing tokens.
  const issuedAt = Math.floor(now / PASSWORD_RESET_WINDOW_MS) * PASSWORD_RESET_WINDOW_MS;
  const payload: PasswordResetPayload = {
    v: 1,
    iss: TOKEN_ISSUER,
    purpose: TOKEN_PURPOSE,
    kind: account.kind,
    id: account.id,
    sessionVersion: account.sessionVersion,
    iat: issuedAt,
    exp: issuedAt + PASSWORD_RESET_TOKEN_TTL_MS,
    emailTag: emailTag(normalized, secret)!
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${encoded}.${signPayload(encoded, secret)}`;
}

export function verifyPasswordResetToken(
  token: unknown,
  now = Date.now(),
  secretOverride?: string
): PasswordResetPayload | null {
  const secret = secretValue(secretOverride);
  if (!secret || typeof token !== 'string' || token.length > 2048) return null;
  const parts = token.split('.');
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]+$/.test(parts[1])) return null;

  const expected = Buffer.from(signPayload(parts[0], secret), 'base64url');
  const supplied = Buffer.from(parts[1], 'base64url');
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;

  let payload: unknown;
  try { payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')); }
  catch { return null; }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const value = payload as Partial<PasswordResetPayload>;
  if (value.v !== 1 || value.iss !== TOKEN_ISSUER || value.purpose !== TOKEN_PURPOSE ||
      (value.kind !== 'STAFF' && value.kind !== 'PARENT') || typeof value.id !== 'string' ||
      !value.id || value.id.length > 128 || !Number.isSafeInteger(value.sessionVersion) ||
      (value.sessionVersion as number) < 0 || !Number.isSafeInteger(value.iat) ||
      !Number.isSafeInteger(value.exp) || typeof value.emailTag !== 'string' ||
      !/^[A-Za-z0-9_-]{43}$/.test(value.emailTag)) return null;

  const issuedAt = value.iat as number;
  const expiresAt = value.exp as number;
  if (issuedAt > now + 30_000 || expiresAt - issuedAt !== PASSWORD_RESET_TOKEN_TTL_MS || now >= expiresAt) return null;
  return value as PasswordResetPayload;
}

export function passwordResetTokenMatchesEmail(payload: PasswordResetPayload, email: unknown, secretOverride?: string): boolean {
  const secret = secretValue(secretOverride);
  const currentTag = secret ? emailTag(email, secret) : null;
  if (!currentTag || currentTag.length !== payload.emailTag.length) return false;
  return timingSafeEqual(Buffer.from(currentTag), Buffer.from(payload.emailTag));
}

export function passwordResetIdempotencyKey(token: string): string {
  return `ditmur-password-reset-${createHash('sha256').update(token).digest('hex')}`;
}
