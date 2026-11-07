"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Loader2 } from 'lucide-react';

let cachedResetToken: string | null = null;

function getResetTokenSnapshot(): string {
  if (typeof window === 'undefined') return '';
  if (cachedResetToken === null) {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
    cachedResetToken = new URLSearchParams(hash).get('token') || '';
  }
  return cachedResetToken;
}

function subscribeToResetToken(onChange: () => void) {
  const handleHashChange = () => {
    cachedResetToken = null;
    onChange();
  };
  window.addEventListener('hashchange', handleHashChange);
  return () => window.removeEventListener('hashchange', handleHashChange);
}

function getServerResetTokenSnapshot() { return ''; }

export default function ResetPasswordForm() {
  const token = useSyncExternalStore(subscribeToResetToken, getResetTokenSnapshot, getServerResetTokenSnapshot);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!window.location.hash) return;
    // Capture the bearer token before removing its fragment from the address
    // bar. Hash fragments are not sent to the server with the page request.
    if (cachedResetToken === null) {
      const hash = window.location.hash.slice(1);
      cachedResetToken = new URLSearchParams(hash).get('token') || '';
    }
    const url = new URL(window.location.href);
    url.hash = '';
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!token) {
      setError('This reset link is missing or invalid. Request a new link.');
      return;
    }
    if (newPassword.length < 12 || newPassword.length > 128) {
      setError('Use a password between 12 and 128 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        setError(result?.error || 'Could not reset your password. Request a new link or contact the school administrator.');
        return;
      }
      setComplete(true);
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setError('Could not reset your password. Check your connection and try again.');
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
          <h1 className="mt-2 text-2xl font-black">Choose a new password</h1>
          <p className="mt-2 text-sm text-blue-100">Cultivating Excellence and Discipline.</p>
        </div>

        <div className="p-6 sm:p-8">
          {complete ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900" role="status" aria-live="polite">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                <div>
                  <h2 className="font-bold">Password reset complete</h2>
                  <p className="mt-1 text-sm leading-6">Your password has been updated. Other existing sessions are invalidated; sign in with your new password.</p>
                  <Link href="/login" className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-[#0033A0] px-4 py-2 font-bold text-white hover:bg-[#002277] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0033A0]">Go to sign in</Link>
                </div>
              </div>
            </div>
          ) : !token ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900" role="status">
              <h2 className="font-bold">Reset link not found</h2>
              <p className="mt-1 text-sm leading-6">This page needs the secure link from your email. Request a new reset link and open it on this device.</p>
              <Link href="/forgot-password" className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-[#0033A0] px-4 py-2 font-bold text-white hover:bg-[#002277]">Request a new link</Link>
            </div>
          ) : (
            <>
              <p className="mb-6 text-sm leading-6 text-slate-600">Choose a new password with at least 12 characters. The link is one-time and expires within 30 minutes.</p>
              {error && <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="new-password" className="mb-2 block text-sm font-bold text-slate-700">New password</label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input id="new-password" type="password" name="newPassword" autoComplete="new-password" minLength={12} maxLength={128} required value={newPassword} onChange={event => setNewPassword(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-3 text-base text-slate-900 outline-none transition focus:border-[#0033A0] focus:ring-4 focus:ring-blue-100" />
                  </div>
                </div>
                <div>
                  <label htmlFor="confirm-password" className="mb-2 block text-sm font-bold text-slate-700">Confirm new password</label>
                  <input id="confirm-password" type="password" name="confirmPassword" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none transition focus:border-[#0033A0] focus:ring-4 focus:ring-blue-100" />
                </div>
                <button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 py-3 font-bold text-white transition hover:bg-[#002277] disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Updating…</> : 'Reset password'}
                </button>
              </form>
            </>
          )}
          <Link href="/login" className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-lg font-semibold text-[#0033A0] hover:text-[#001c5b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0033A0]">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
