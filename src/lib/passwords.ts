import { randomBytes, timingSafeEqual } from 'crypto';
import { compare, hash } from 'bcryptjs';

const KNOWN_DEMO_PASSWORDS = new Set(['admin123', 'student123', 'parent123', 'ditmur2026']);
const BCRYPT_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
export const isKnownDemoPassword = (value: string) => KNOWN_DEMO_PASSWORDS.has(value.toLowerCase());
export const isPasswordHash = (value: string | null | undefined) => !!value && BCRYPT_PATTERN.test(value);

export function newTemporaryPassword(): string {
  return randomBytes(18).toString('base64url');
}
export async function hashPassword(value: string): Promise<string> { return hash(value, 12); }

// Legacy custom plaintext credentials can sign in ONCE and are immediately
// upgraded to a bcrypt hash by the caller. Published demo passwords never work.
export async function checkPassword(stored: string | null | undefined, attempted: string): Promise<{ valid: boolean; upgrade: boolean }> {
  if (!stored || !attempted || isKnownDemoPassword(attempted) || isKnownDemoPassword(stored)) return { valid: false, upgrade: false };
  if (isPasswordHash(stored)) return { valid: await compare(attempted, stored), upgrade: false };
  const a = Buffer.from(stored);
  const b = Buffer.from(attempted);
  const valid = a.length === b.length && timingSafeEqual(a, b);
  return { valid, upgrade: valid };
}

export function validateNewPassword(value: string): string | null {
  if (value.length < 12 || value.length > 128) return 'Use a password of at least 12 characters';
  if (isKnownDemoPassword(value)) return 'Choose a password different from the old demo passwords';
  return null;
}
