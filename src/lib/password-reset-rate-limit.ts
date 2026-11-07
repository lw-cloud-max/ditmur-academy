import { createHash } from 'crypto';
import { PASSWORD_RESET_WINDOW_MS } from '@/lib/password-reset-token';
import { normalizeEmail } from '@/lib/normalize-email';

const IP_WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_IP = 5;
const MAX_PER_EMAIL_WINDOW = 1;
type Bucket = { startsAt: number; count: number };
const buckets = new Map<string, Bucket>();

function consume(key: string, windowMs: number, limit: number, now: number): boolean {
  const startsAt = Math.floor(now / windowMs) * windowMs;
  const previous = buckets.get(key);
  if (!previous || previous.startsAt !== startsAt) {
    buckets.set(key, { startsAt, count: 1 });
    return true;
  }
  if (previous.count >= limit) return false;
  previous.count += 1;
  return true;
}

/** Best-effort process-local protection; Resend idempotency adds cross-instance deduplication. */
export function allowPasswordResetRequest(ip: string, email: unknown, now = Date.now()): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const emailKey = createHash('sha256').update(normalized).digest('hex');

  // Keep the in-memory map bounded and remove old entries opportunistically.
  if (buckets.size > 2_000) {
    for (const [key, bucket] of buckets) {
      if (now - bucket.startsAt > Math.max(IP_WINDOW_MS, PASSWORD_RESET_WINDOW_MS) * 2) buckets.delete(key);
    }
    while (buckets.size > 1_500) buckets.delete(buckets.keys().next().value!);
  }

  const safeIp = (ip || 'unknown').slice(0, 100);
  const emailAllowed = consume(`email:${emailKey}`, PASSWORD_RESET_WINDOW_MS, MAX_PER_EMAIL_WINDOW, now);
  const ipAllowed = consume(`ip:${safeIp}`, IP_WINDOW_MS, MAX_PER_IP, now);
  return emailAllowed && ipAllowed;
}
