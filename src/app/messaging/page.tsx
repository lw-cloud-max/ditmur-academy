import Link from 'next/link';
import { AlertTriangle, ArrowLeft, ShieldCheck } from 'lucide-react';

// The old bulk sender simulated success without sending email or SMS.
// Keep a visible explanation instead of a misleading Compose form.
export default function MessagingPage() {
  return <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
    <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-blue-800"><ArrowLeft size={16} /> Back to dashboard</Link>
    <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-8 text-slate-900">
      <div className="flex items-center gap-3"><AlertTriangle className="text-amber-700 shrink-0" /><h1 className="text-2xl font-black">Broadcast messaging is not available</h1></div>
      <p className="mt-4 leading-relaxed">This school app does not currently send bulk email or SMS. The former Compose Broadcast screen was a demonstration and did not deliver messages. It has been turned off to avoid misleading delivery confirmations.</p>
      <p className="mt-3 text-sm">For urgent school communications, use your school-approved communication process. Do not upload contact lists or assume any message has been sent from this screen.</p>
      <div className="mt-5 flex items-start gap-2 rounded-xl border border-blue-200 bg-white p-4 text-sm"><ShieldCheck className="shrink-0 text-blue-700" size={18} /><p>Super-admin SMS Notifications is a separate, single-recipient feature. Live SMS remains disabled until Nigeria Sender ID approval and a separately authorised test.</p></div>
    </section>
  </main>;
}
