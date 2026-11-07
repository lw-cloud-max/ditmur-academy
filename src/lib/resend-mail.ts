export type ResendMailConfig = {
  configured: boolean;
  testEnabled: boolean;
  newsletterEnabled: boolean;
  from: string | null;
  replyTo: string;
  reason: string;
};

export type ResendEmail = {
  from: string;
  to: string[];
  subject: string;
  text: string;
  reply_to?: string;
};

export type ResendSendResult = {
  success: boolean;
  status: 'ACCEPTED' | 'FAILED' | 'UNKNOWN';
  id?: string;
  error?: string;
};

export function getResendMailConfig(): ResendMailConfig {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || null;
  const replyTo = process.env.EMAIL_REPLY_TO?.trim() || 'ditmuracademy@gmail.com';
  const configured = !!key && !!from;
  const testEnabled = configured && process.env.RESEND_EMAILS_ENABLED === 'true';
  const newsletterEnabled = testEnabled && process.env.RESEND_NEWSLETTER_ENABLED === 'true';
  const reason = !key ? 'RESEND_API_KEY is not configured.'
    : !from ? 'EMAIL_FROM is not configured.'
      : !testEnabled ? 'Email sending is off until RESEND_EMAILS_ENABLED=true is set in Vercel.'
        : !newsletterEnabled ? 'Test email is enabled. Parent newsletters remain off until RESEND_NEWSLETTER_ENABLED=true is set after the test.'
          : 'Resend email and newsletter sending are enabled.';
  return { configured, testEnabled, newsletterEnabled, from, replyTo, reason };
}

async function sendRequest(path: string, payload: unknown, idempotencyKey?: string): Promise<ResendSendResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return { success: false, status: 'FAILED', error: 'Resend is not configured.' };
  try {
    const response = await fetch(`https://api.resend.com${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {})
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000)
    });
    const data = await response.json().catch(() => null) as { id?: unknown; data?: unknown[]; message?: unknown } | null;
    if (!response.ok) return {
      success: false,
      status: response.status >= 500 ? 'UNKNOWN' : 'FAILED',
      error: response.status >= 500
        ? 'Resend’s response was uncertain. Check the Resend email logs before retrying.'
        : `Resend rejected the request (HTTP ${response.status}). Check the sender/domain configuration.`
    };
    if (path === '/emails/batch') {
      const ids = Array.isArray(data?.data) ? data.data.filter((item): item is { id: string } => !!item && typeof item === 'object' && typeof (item as {id?: unknown}).id === 'string') : [];
      if (!ids.length) return { success: false, status: 'UNKNOWN', error: 'Resend returned no batch IDs. Check the Resend logs before retrying.' };
      return { success: true, status: 'ACCEPTED', id: ids.map(item => item.id).join(',') };
    }
    if (typeof data?.id !== 'string' || !data.id) return { success: false, status: 'UNKNOWN', error: 'Resend returned an unexpected response. Check the email logs before retrying.' };
    return { success: true, status: 'ACCEPTED', id: data.id };
  } catch (error) {
    console.error('Resend request failed:', error instanceof Error ? error.name : 'unknown');
    return { success: false, status: 'UNKNOWN', error: 'Email outcome may be unknown. Check Resend logs before retrying.' };
  }
}

export function sendResendEmail(email: ResendEmail, idempotencyKey?: string) {
  return sendRequest('/emails', email, idempotencyKey);
}

export function sendResendBatch(emails: ResendEmail[], idempotencyKey: string) {
  return sendRequest('/emails/batch', emails, idempotencyKey);
}

export function isValidEmailAddress(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
