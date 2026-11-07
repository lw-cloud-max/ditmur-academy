"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSent(false);
    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const result = await response.json().catch(() => null);
      if (response.ok) {
        setSent(true);
      } else {
        setError(result?.error || 'Could not process your request. Please try again later.');
      }
    } catch {
      setError('Could not process your request. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#eaf4fa] px-4 py-10 flex items-center justify-center font-sans">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
        <div className="bg-gradient-to-br from-[#0A192F] to-[#002277] px-7 py-8 text-center text-white">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-2 shadow-lg">
            <Image src="/logo.jpg" alt="Ditmur Academy logo" width={64} height={64} className="h-full w-full object-contain" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FFD700]">Ditmur Academy</p>
          <h1 className="mt-2 text-2xl font-black">Reset your password</h1>
          <p className="mt-2 text-sm text-blue-100">Cultivating Excellence and Discipline.</p>
        </div>

        <div className="p-6 sm:p-8">
          {sent ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900" role="status" aria-live="polite">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                <div>
                  <h2 className="font-bold">Check your inbox</h2>
                  <p className="mt-1 text-sm leading-6">If a matching eligible staff or parent account exists, reset instructions will be sent shortly. If you don’t receive an email, check your spam folder or contact the school administrator.</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <p className="mb-6 text-sm leading-6 text-slate-600">Enter the email registered to your staff or parent account. For security, this page won’t reveal whether an account matches.</p>
              {error && <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="reset-email" className="mb-2 block text-sm font-bold text-slate-700">Registered email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="reset-email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      required
                      maxLength={254}
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                      className="min-h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-3 text-base text-slate-900 outline-none transition focus:border-[#0033A0] focus:ring-4 focus:ring-blue-100"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 py-3 font-bold text-white transition hover:bg-[#002277] disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Sending…</> : 'Send reset link'}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            Student accounts continue to use Student ID and password. Students and anyone whose email is shared by multiple school accounts should contact the school administrator for help.
          </div>
          <Link href="/login" className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-lg font-semibold text-[#0033A0] hover:text-[#001c5b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0033A0]">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
