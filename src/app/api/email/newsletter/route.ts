import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isSuperAdmin } from '@/lib/permissions';
import { getResendMailConfig, isValidEmailAddress, sendResendBatch, type ResendEmail } from '@/lib/resend-mail';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store, max-age=0' };
const BATCH_SIZE = 100;
const MAX_RECIPIENTS = 500;

type Audience = { emails: string[]; activeParentRecords: number; missingEmails: number; duplicateEmails: number };
async function getAudience() : Promise<Audience> {
  const parents = await prisma.parent.findMany({
    where: { students: { some: { status: 'ACTIVE' } } },
    select: { email: true }
  });
  const unique = new Map<string, string>();
  let missingEmails = 0;
  for (const parent of parents) {
    const email = parent.email?.trim();
    if (!email || !isValidEmailAddress(email)) { missingEmails += 1; continue; }
    const key = email.toLowerCase();
    if (!unique.has(key)) unique.set(key, email);
  }
  return { emails: Array.from(unique.values()), activeParentRecords: parents.length,
    missingEmails, duplicateEmails: Math.max(0, parents.length - missingEmails - unique.size) };
}
function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 1)}***@${domain}`;
}
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char] || char));

export async function GET() {
  try {
    if (!isSuperAdmin(await auth())) return NextResponse.json({ success: false, error: 'Super admin required' }, { status: 403, headers: noStore });
    const audience = await getAudience();
    return NextResponse.json({ success: true, data: {
      activeParentRecords: audience.activeParentRecords,
      uniqueRecipients: audience.emails.length,
      duplicateEmailRecords: audience.duplicateEmails,
      parentsWithoutEmail: audience.missingEmails,
      sampleMaskedRecipients: audience.emails.slice(0, 12).map(maskEmail)
    } }, { headers: noStore });
  } catch (error) {
    console.error('Newsletter audience preview failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ success: false, error: 'Could not preview newsletter recipients' }, { status: 500, headers: noStore });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!isSuperAdmin(session)) return NextResponse.json({ success: false, error: 'Super admin required' }, { status: 403, headers: noStore });
    const origin = req.headers.get('origin');
    if (origin && new URL(origin).host !== new URL(req.url).host) return NextResponse.json({ success: false, error: 'Request origin not allowed' }, { status: 403, headers: noStore });
    const config = getResendMailConfig();
    if (!config.newsletterEnabled || !config.from) return NextResponse.json({ success: false, error: config.reason }, { status: 503, headers: noStore });
    const raw: unknown = await req.json();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return NextResponse.json({ success: false, error: 'Invalid newsletter request' }, { status: 400, headers: noStore });
    const body = raw as Record<string, unknown>;
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const expectedCount = typeof body.expectedRecipientCount === 'number' ? body.expectedRecipientCount : -1;
    const campaignId = typeof body.campaignId === 'string' ? body.campaignId : '';
    if (!subject || subject.length > 150 || !text || text.length > 5000 || expectedCount < 1 ||
        !/^[A-Za-z0-9-]{12,80}$/.test(campaignId) || body.confirmed !== true || body.consent !== true) {
      return NextResponse.json({ success: false, error: 'Enter a subject/message, review the audience, and explicitly confirm the school-approved send.' }, { status: 400, headers: noStore });
    }

    const audience = await getAudience();
    if (audience.emails.length !== expectedCount) {
      return NextResponse.json({ success: false, error: 'The active Parent email audience changed since preview. Review the new count before sending.',
        data: { uniqueRecipients: audience.emails.length, duplicateEmailRecords: audience.duplicateEmails, parentsWithoutEmail: audience.missingEmails } },
        { status: 409, headers: noStore });
    }
    if (!audience.emails.length || audience.emails.length > MAX_RECIPIENTS) {
      return NextResponse.json({ success: false, error: `Newsletter recipient count must be between 1 and ${MAX_RECIPIENTS}.` }, { status: 409, headers: noStore });
    }

    const footer = `\n\n—\nDitmur Academy\nCultivating Excellence and Discipline.\nFor replies or communication preferences: ${config.replyTo}`;
    const message = `${text}${footer}`;
    const htmlMessage = `<div style="font-family:Arial,sans-serif;line-height:1.6;white-space:normal">${escapeHtml(text).split(/\r?\n/).map(line => `<p>${line || '&nbsp;'}</p>`).join('')}<hr><p><strong>Ditmur Academy</strong><br>Cultivating Excellence and Discipline.<br>For replies or communication preferences: <a href="mailto:${escapeHtml(config.replyTo)}">${escapeHtml(config.replyTo)}</a></p></div>`;
    let accepted = 0;
    for (let start = 0, batchNumber = 0; start < audience.emails.length; start += BATCH_SIZE, batchNumber += 1) {
      const chunk = audience.emails.slice(start, start + BATCH_SIZE);
      const messages: ResendEmail[] = chunk.map(to => ({
        from: config.from!, to: [to], subject, text: message, html: htmlMessage,
        ...(config.replyTo ? { reply_to: config.replyTo } : {})
      }));
      const result = await sendResendBatch(messages, `ditmur-newsletter-${campaignId}-${batchNumber}`);
      if (!result.success) {
        return NextResponse.json({ success: false, status: result.status, partial: accepted > 0,
          accepted, total: audience.emails.length,
          error: `${result.error || 'Resend did not confirm this batch.'} Check Resend logs before retrying; earlier batches may already have been accepted.` },
          { status: 502, headers: noStore });
      }
      accepted += result.id ? result.id.split(',').filter(Boolean).length : chunk.length;
    }
    return NextResponse.json({ success: true, data: { accepted, total: audience.emails.length },
      message: `Resend accepted ${accepted} of ${audience.emails.length} email(s). This does not confirm inbox delivery; check Resend logs.` }, { headers: noStore });
  } catch (error) {
    console.error('Newsletter send failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ success: false, status: 'UNKNOWN', error: 'Newsletter outcome may be unknown. Check Resend logs before retrying.' }, { status: 500, headers: noStore });
  }
}
