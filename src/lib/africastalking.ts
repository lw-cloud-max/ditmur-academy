// Africa's Talking legacy SMS API. Mode is DISABLED unless explicitly set.
// Live sending requires a separate, deliberate opt-in and approved sender ID.
export type SMSMode = 'disabled' | 'sandbox' | 'live';
export type SMSConfig = { mode: SMSMode; enabled: boolean; reason: string; senderId?: string };

export function getSMSConfig(): SMSConfig {
  const selected = process.env.AFRICASTALKING_MODE;
  const mode: SMSMode = selected === 'sandbox' || selected === 'live' ? selected : 'disabled';
  if (mode === 'disabled') return { mode, enabled: false, reason: 'SMS sending is disabled while live Sender ID approval is pending.' };
  const key = process.env.AFRICASTALKING_API_KEY?.trim();
  const username = process.env.AFRICASTALKING_USERNAME?.trim();
  if (mode === 'sandbox') {
    return key && username === 'sandbox'
      ? { mode, enabled: true, reason: 'Sandbox only: SMS goes to the simulator, not real phones.' }
      : { mode, enabled: false, reason: 'Sandbox needs a sandbox API key and username sandbox.' };
  }
  const senderId = process.env.AFRICASTALKING_SENDER_ID?.trim();
  if (process.env.AFRICASTALKING_LIVE_ENABLED !== 'true') return { mode, enabled: false, reason: 'Live SMS requires explicit approval and AFRICASTALKING_LIVE_ENABLED=true.' };
  if (!key || !username || username === 'sandbox') return { mode, enabled: false, reason: 'A live application username and live API key are required.' };
  if (!senderId || !/^[A-Za-z0-9]{3,11}$/.test(senderId)) return { mode, enabled: false, reason: 'A registered Nigeria sender ID (3-11 letters/numbers) is required.' };
  return { mode, enabled: true, reason: 'Live SMS enabled: sending may incur charges. Provider acceptance is NOT phone delivery.', senderId };
}

export type SMSResult = { success: boolean; status: 'ACCEPTED' | 'FAILED' | 'UNKNOWN'; messageId?: string; error?: string };

export function formatNigeriaPhone(phone: string): string | null {
  const trimmed = phone.replace(/[\s()-]/g, '');
  const normalized = trimmed.startsWith('0') ? '+234' + trimmed.slice(1)
    : trimmed.startsWith('234') ? '+' + trimmed : trimmed;
  return /^\+234[789]\d{9}$/.test(normalized) ? normalized : null;
}

export async function sendSMS({ to, message }: { to: string; message: string }): Promise<SMSResult> {
  const config = getSMSConfig();
  if (!config.enabled) return { success: false, status: 'FAILED', error: config.reason };
  const number = formatNigeriaPhone(to);
  if (!number) return { success: false, status: 'FAILED', error: 'Parent phone must be a valid Nigerian mobile number.' };
  if (!message.trim() || message.length > 320) return { success: false, status: 'FAILED', error: 'Message must be 1-320 characters.' };
  const url = config.mode === 'sandbox'
    ? 'https://api.sandbox.africastalking.com/version1/messaging'
    : 'https://api.africastalking.com/version1/messaging';
  const form = new URLSearchParams({
    username: config.mode === 'sandbox' ? 'sandbox' : process.env.AFRICASTALKING_USERNAME!.trim(),
    to: number, message
  });
  if (config.mode === 'live' && config.senderId) form.set('from', config.senderId);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { apiKey: process.env.AFRICASTALKING_API_KEY!.trim(), 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: form.toString(), signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) return { success: false, status: response.status >= 500 ? 'UNKNOWN' : 'FAILED', error: `Africa's Talking returned HTTP ${response.status}. ${response.status >= 500 ? 'Check provider logs before retrying.' : 'No SMS was accepted.'}` };
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== 'object' || !('SMSMessageData' in payload)) {
      return { success: false, status: 'UNKNOWN', error: 'Unexpected provider response. Check provider logs before retrying.' };
    }
    const sms = (payload as { SMSMessageData?: { Recipients?: unknown[]; Message?: string } }).SMSMessageData;
    const recipients = sms?.Recipients;
    if (!Array.isArray(recipients) || recipients.length !== 1) {
      return { success: false, status: 'UNKNOWN', error: 'Unexpected recipient count. Check provider logs before retrying.' };
    }
    const record = recipients[0] as { status?: unknown; statusCode?: unknown; messageId?: unknown };
    const accepted = record?.status === 'Success' && [100, 101, 102].includes(Number(record.statusCode)) &&
      typeof record.messageId === 'string' && record.messageId !== 'None' && !!record.messageId;
    if (!accepted) {
      const code = typeof record?.statusCode === 'number' ? ` (${record.statusCode})` : '';
      return { success: false, status: 'FAILED', error: `SMS not accepted by provider${code}. Check sender ID, balance and recipient.` };
    }
    // Accepted by API; only a later delivery report confirms handset receipt.
    return { success: true, status: 'ACCEPTED', messageId: record.messageId as string };
  } catch (error) {
    console.error('Africa Talking SMS request failed:', error instanceof Error ? error.name : 'unknown error');
    return { success: false, status: 'UNKNOWN', error: 'SMS outcome unknown. Check Africa\'s Talking logs before retrying; it may have been accepted.' };
  }
}

export { SMS_TEMPLATES } from './sms-templates';
