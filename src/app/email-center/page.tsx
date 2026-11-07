"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AlertCircle, CheckCircle2, Loader2, Mail, Send } from 'lucide-react';

type EmailConfig = { testEnabled: boolean; newsletterEnabled: boolean; from: string | null; replyTo: string; reason: string };
type Audience = { activeParentRecords: number; uniqueRecipients: number; duplicateEmailRecords: number; parentsWithoutEmail: number; sampleMaskedRecipients: string[] };

export default function EmailCenterPage() {
  const { data: session, status: sessionStatus } = useSession();
  const isSuperAdmin = session?.user?.role === 'ADMIN' && session?.user?.id === 'admin-1';
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [audience, setAudience] = useState<Audience | null>(null);
  const [loading, setLoading] = useState(true);
  const [testTo, setTestTo] = useState('');
  const [testConsent, setTestConsent] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState('');
  const [newsletterSubject, setNewsletterSubject] = useState('');
  const [newsletterText, setNewsletterText] = useState('');
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [newsletterSending, setNewsletterSending] = useState(false);
  const [campaignId, setCampaignId] = useState('');
  const [newsletterResult, setNewsletterResult] = useState('');
  const [error, setError] = useState('');

  const refresh = async () => {
    const [configResponse, audienceResponse] = await Promise.all([
      fetch('/api/email/config', { cache: 'no-store' }),
      fetch('/api/email/newsletter', { cache: 'no-store' })
    ]);
    const [configData, audienceData] = await Promise.all([configResponse.json(), audienceResponse.json()]);
    if (!configResponse.ok || !configData.success) throw new Error(configData.error || 'Could not load Resend settings');
    if (!audienceResponse.ok || !audienceData.success) throw new Error(audienceData.error || 'Could not preview parent email audience');
    setConfig(configData.data); setAudience(audienceData.data);
  };

  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !isSuperAdmin) return;
    let active = true;
    Promise.all([
      fetch('/api/email/config', { cache: 'no-store' }).then(async response => ({ response, data: await response.json() })),
      fetch('/api/email/newsletter', { cache: 'no-store' }).then(async response => ({ response, data: await response.json() }))
    ]).then(([configResult, audienceResult]) => {
      if (!active) return;
      if (!configResult.response.ok || !configResult.data.success) throw new Error(configResult.data.error || 'Could not load Resend settings');
      if (!audienceResult.response.ok || !audienceResult.data.success) throw new Error(audienceResult.data.error || 'Could not preview parent email audience');
      setConfig(configResult.data.data); setAudience(audienceResult.data.data);
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load email settings'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sessionStatus, isSuperAdmin]);

  const sendTest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!config?.testEnabled || !testTo.trim() || !testConsent || testSending) return;
    if (!window.confirm(`Send exactly ONE email connection test to ${testTo.trim()}?\n\nThis is a test message only; no parent/student details are included.`)) return;
    setTestSending(true); setTestResult(''); setError('');
    try {
      const response = await fetch('/api/email/test', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testTo, consent: true, confirmed: true }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Resend did not accept the test email');
      setTestResult(result.message || 'Accepted by Resend; inbox delivery is not confirmed yet.');
      setTestTo(''); setTestConsent(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Email outcome may be unknown. Check Resend logs before retrying.'); }
    finally { setTestSending(false); }
  };

  const sendNewsletter = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!config?.newsletterEnabled || !audience?.uniqueRecipients || !newsletterSubject.trim() || !newsletterText.trim() || !newsletterConsent || newsletterSending) return;
    const nextCampaignId = campaignId || crypto.randomUUID();
    if (!window.confirm(`Send this school newsletter to ${audience.uniqueRecipients} unique Parent email address(es)?\n\nSubject: ${newsletterSubject.trim()}\n\nResend acceptance is not proof of inbox delivery. If the result is unknown, check Resend logs before retrying.`)) return;
    setCampaignId(nextCampaignId); setNewsletterSending(true); setNewsletterResult(''); setError('');
    try {
      const response = await fetch('/api/email/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: newsletterSubject, text: newsletterText, expectedRecipientCount: audience.uniqueRecipients,
          campaignId: nextCampaignId, consent: true, confirmed: true }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Newsletter send failed. Check Resend logs before retrying.');
      setNewsletterResult(result.message || 'Accepted by Resend. Check email delivery reports.');
      setNewsletterSubject(''); setNewsletterText(''); setNewsletterConsent(false); setCampaignId('');
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Newsletter outcome may be unknown. Check Resend logs before retrying.'); }
    finally { setNewsletterSending(false); }
  };

  if (sessionStatus === 'loading') return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-700" /></div>;
  if (!isSuperAdmin) return <div className="mx-auto max-w-3xl rounded-xl border bg-white p-6 text-slate-700">Only the super admin can manage school email.</div>;
  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-700" /></div>;

  return <div className="mx-auto max-w-5xl space-y-6 pb-32">
    <header><h1 className="flex items-center gap-2 text-2xl font-black text-slate-900"><Mail className="text-blue-700" /> Email Center</h1>
      <p className="mt-1 text-sm text-slate-600">Resend is used only after a super-admin action. No automatic emails are sent by grades or attendance.</p></header>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>}
    {testResult && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"><CheckCircle2 className="mr-2 inline h-5 w-5" />{testResult}</p>}
    {newsletterResult && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"><CheckCircle2 className="mr-2 inline h-5 w-5" />{newsletterResult}</p>}

    <section className={`rounded-xl border p-4 ${config?.testEnabled ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
      <h2 className="font-bold text-slate-900">{config?.testEnabled ? 'Resend is configured for the test email' : 'Resend email sending is not enabled yet'}</h2>
      <p className="mt-1 text-sm text-slate-700">{config?.reason}</p>
      {config?.from && <p className="mt-1 text-xs text-slate-600">From: {config.from} · Reply-to: {config.replyTo}</p>}
      <p className="mt-2 text-xs text-slate-600">The API key is never shown in this page. “Accepted” means Resend accepted the request; check its delivery log to confirm inbox delivery.</p>
    </section>

    <section className="rounded-2xl border bg-white p-4 sm:p-6 space-y-4">
      <div><h2 className="text-lg font-bold text-slate-900">Send one test email</h2>
        <p className="mt-1 text-sm text-slate-600">Send the fixed test to your own inbox or a consenting staff member. No student or Parent details are included.</p></div>
      <form onSubmit={sendTest} className="space-y-3">
        <label className="block text-sm font-semibold text-slate-800">Test email address
          <input type="email" required maxLength={254} value={testTo} onChange={event => setTestTo(event.target.value)} placeholder="you@example.com" className="mt-1 block w-full rounded-lg border p-3" />
        </label>
        <label className="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" checked={testConsent} onChange={event => setTestConsent(event.target.checked)} className="mt-1" />
          I own this inbox or have permission to send one test email to it.
        </label>
        <button type="submit" disabled={!config?.testEnabled || !testTo.trim() || !testConsent || testSending} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-800 px-5 py-3 font-bold text-white disabled:opacity-50">
          {testSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{testSending ? 'Sending one test…' : 'Review and send one test'}
        </button>
      </form>
    </section>

    <section className="rounded-2xl border bg-white p-4 sm:p-6 space-y-4">
      <div><h2 className="text-lg font-bold text-slate-900">Parent newsletter</h2>
        <p className="mt-1 text-sm text-slate-600">Preview is deduplicated by normalized email and includes only Parent records with an active student. Addresses are masked here. No email is sent until you explicitly confirm.</p></div>
      {!audience?.uniqueRecipients ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No active Parent email addresses are available.</p> : <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
        <p><strong>{audience.uniqueRecipients}</strong> unique recipients from {audience.activeParentRecords} active Parent records. {audience.duplicateEmailRecords} duplicate email record(s) will be deduplicated; {audience.parentsWithoutEmail} record(s) have no usable email.</p>
        {audience.sampleMaskedRecipients.length > 0 && <p className="mt-2 text-xs text-slate-500">Sample: {audience.sampleMaskedRecipients.join(', ')}</p>}
      </div>}
      {!config?.newsletterEnabled && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Newsletter sending is disabled until `RESEND_NEWSLETTER_ENABLED=true` is set in Vercel after the test email is confirmed.</p>}
      <form onSubmit={sendNewsletter} className="space-y-3">
        <label className="block text-sm font-semibold text-slate-800">Subject
          <input required maxLength={150} value={newsletterSubject} onChange={event => { setNewsletterSubject(event.target.value); setCampaignId(''); }} className="mt-1 block w-full rounded-lg border p-3" />
        </label>
        <label className="block text-sm font-semibold text-slate-800">Message
          <textarea required maxLength={5000} rows={7} value={newsletterText} onChange={event => { setNewsletterText(event.target.value); setCampaignId(''); }} className="mt-1 block w-full rounded-lg border p-3" placeholder="Write a school-approved update for parents and guardians." />
        </label>
        <label className="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" checked={newsletterConsent} onChange={event => setNewsletterConsent(event.target.checked)} className="mt-1" />
          I confirm this is an approved school communication and these recipients are authorized to receive it.
        </label>
        <button type="submit" disabled={!config?.newsletterEnabled || !audience?.uniqueRecipients || !newsletterSubject.trim() || !newsletterText.trim() || !newsletterConsent || newsletterSending} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 font-bold text-white disabled:opacity-50">
          {newsletterSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{newsletterSending ? 'Sending newsletter…' : `Review and send to ${audience?.uniqueRecipients || 0} recipients`}
        </button>
        <p className="flex items-start gap-2 text-xs text-amber-800"><AlertCircle className="h-4 w-4 shrink-0" />If a batch result is unknown or partial, check Resend logs before retrying. No automatic retries are performed.</p>
      </form>
    </section>
  </div>;
}
