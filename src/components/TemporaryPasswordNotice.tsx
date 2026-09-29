"use client";

import { useState } from 'react';
import { Copy, X } from 'lucide-react';

export type IssuedCredential = { kind: 'STUDENT' | 'PARENT' | 'STAFF'; id: string; temporaryPassword: string };

export default function TemporaryPasswordNotice({ credential, onClose }: { credential: IssuedCredential | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  if (!credential) return null;
  return <div role="alert" className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-950 space-y-3">
    <div className="flex items-center justify-between gap-2"><strong>Temporary login issued for {credential.kind.toLowerCase()} {credential.id}</strong>
      <button type="button" aria-label="Dismiss temporary password" onClick={() => { setCopied(false); onClose(); }} className="p-2"><X size={18} /></button></div>
    <p className="text-sm">Shown once only. Share privately with the account holder; they must change it on first login. Do not post it in a group.</p>
    <div className="flex flex-wrap items-center gap-2">
      <code className="break-all bg-white border rounded-lg px-3 py-2 font-semibold">{credential.temporaryPassword}</code>
      <button type="button" onClick={async () => {
        try { await navigator.clipboard.writeText(credential.temporaryPassword); setCopied(true); }
        catch { setCopied(false); }
      }} className="inline-flex items-center gap-1 px-3 py-2 bg-white border rounded-lg text-sm font-bold"><Copy size={16} />{copied ? 'Copied' : 'Copy'}</button>
    </div>
  </div>;
}
