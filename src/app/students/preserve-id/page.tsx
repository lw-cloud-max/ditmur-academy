'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';

type Parent = { id: string; fullName: string; email: string | null;
  students: { id: string; firstName: string; lastName: string }[] };
type SchoolClass = { id: string; name: string };
type Candidate = { id: string; firstName: string; lastName: string; otherNames?: string | null; class?: { name: string } | null };
type Preview = { id: string; canCreate: boolean; idMatches: Candidate[]; possibleDuplicates: Candidate[];
  schoolClass: SchoolClass | null; parent: Parent | null };
const blank = { id: '', firstName: '', lastName: '', otherNames: '', dob: '', gender: '', classId: '', parentId: '' };

export default function PreserveStudentIdPage() {
  const { data: session, status } = useSession();
  const admin = session?.user?.role === 'ADMIN' && session.user.id === 'admin-1';
  const [form, setForm] = useState(blank);
  const [parents, setParents] = useState<Parent[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!admin) return;
    fetch('/api/students/preserve-id', { cache: 'no-store' }).then(async res => {
      const result = await res.json();
      if (!res.ok || !result.success) throw Error(result.error || 'Could not load school records');
      setClasses(result.classes); setParents(result.parents);
    }).catch(cause => setError(cause instanceof Error ? cause.message : 'Could not load school records'));
  }, [admin]);
  const change = (key: keyof typeof blank, value: string) => {
    setForm(prev => ({ ...prev, [key]: value })); setPreview(null); setConfirmed(false); setSuccess('');
  };
  async function submit(action: 'preview' | 'create') {
    setError(''); setBusy(true);
    try {
      const res = await fetch('/api/students/preserve-id', { method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ ...form, action, confirmed: action === 'create' && confirmed }) });
      const json = await res.json();
      if (!res.ok || !json.success) throw Error(json.error || 'Request failed. Check the directory before retrying.');
      if (action === 'preview') { setPreview(json.data); setConfirmed(false); }
      else { setSuccess(`Created Student ${json.data.id} with their original ID. No password issued.`);
        setPreview(null); setConfirmed(false); setForm(blank); setSearch(''); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); setConfirmed(false); }
    finally { setBusy(false); }
  }
  if (status === 'loading') return <main className="p-6">Checking access...</main>;
  if (!admin) return <main className="p-6 font-bold">This feature is available to the super admin only.</main>;
  const filtered = parents.filter(p => `${p.fullName} ${p.email || ''} ${p.students.map(c => `${c.firstName} ${c.lastName}`).join(' ')}`.toLowerCase().includes(search.toLowerCase())).slice(0, 60);
  return <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10 pb-28 space-y-5">
    <Link href="/students" className="inline-flex items-center gap-2 text-sm font-bold text-blue-800"><ArrowLeft size={16} /> Back to Students</Link>
    <header className="rounded-2xl bg-[#0A192F] text-white p-6"><h1 className="text-2xl font-black">Add missing Student · keep original ID</h1>
      <p className="mt-2 text-sm text-blue-100">Super admin only. Use only for a confirmed current student whose roster ID is absent from the school app.</p></header>
    <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 flex gap-2"><AlertTriangle size={18} className="shrink-0" /> Do not bulk-add all unmatched CSV rows: some may be historical or have different names in the app. Verify each student privately. This form will not create a Parent or issue a password.</p>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>}
    {success && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-900 flex gap-2"><CheckCircle2 size={18} /> {success} Use the super-admin password reset only when ready to hand over access.</p>}
    <form onSubmit={event => { event.preventDefault(); void submit('preview'); }} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 space-y-4">
      <h2 className="text-lg font-bold">Student details from verified school records</h2>
      <label className="block text-sm font-semibold">Original Student ID (useralias)
        <input required value={form.id} onChange={e => change('id', e.target.value)} placeholder="e.g. DIT/STU/123" maxLength={80} className="mt-1 w-full rounded-xl border p-3 uppercase" autoCapitalize="characters" />
      </label>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-sm font-semibold">First name<input required value={form.firstName} onChange={e => change('firstName', e.target.value)} maxLength={80} className="mt-1 w-full rounded-xl border p-3" /></label>
        <label className="block text-sm font-semibold">Surname<input required value={form.lastName} onChange={e => change('lastName', e.target.value)} maxLength={80} className="mt-1 w-full rounded-xl border p-3" /></label>
      </div>
      <label className="block text-sm font-semibold">Other names (optional)<input value={form.otherNames} onChange={e => change('otherNames', e.target.value)} maxLength={120} className="mt-1 w-full rounded-xl border p-3" /></label>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-sm font-semibold">Date of birth<input required type="date" value={form.dob} onChange={e => change('dob', e.target.value)} className="mt-1 w-full rounded-xl border p-3" /></label>
        <label className="block text-sm font-semibold">Gender<select required value={form.gender} onChange={e => change('gender', e.target.value)} className="mt-1 w-full rounded-xl border p-3 bg-white"><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option></select></label>
      </div>
      <label className="block text-sm font-semibold">Current class<select required value={form.classId} onChange={e => change('classId', e.target.value)} className="mt-1 w-full rounded-xl border p-3 bg-white"><option value="">Select class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <div className="rounded-xl border bg-slate-50 p-4 space-y-2">
        <label className="block text-sm font-semibold">Existing verified Parent (optional)</label>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search guardian or existing child" className="w-full rounded-lg border p-3 text-sm" />
        <select value={form.parentId} onChange={e => change('parentId', e.target.value)} className="w-full rounded-lg border p-3 bg-white text-sm">
          <option value="">No verified Parent yet — leave student unlinked</option>
          {filtered.map(p => <option key={p.id} value={p.id}>{p.fullName} · {p.email || 'no email'} · {p.students.map(c => `${c.firstName} ${c.lastName} (${c.id})`).join(', ') || 'no linked children'} · {p.id}</option>)}
          {form.parentId && !filtered.some(p => p.id === form.parentId) && <option value={form.parentId}>Selected Parent (outside current search)</option>}
        </select>
        <p className="text-xs text-slate-600">Choose only after checking the guardian's identity and current children. Matching email or surname alone is not proof. An unlinked student cannot appear in a Parent account.</p>
      </div>
      <button type="submit" disabled={busy} className="min-h-12 w-full rounded-xl bg-blue-800 px-4 font-bold text-white disabled:opacity-50">{busy ? <Loader2 className="inline-block animate-spin" /> : 'Preview duplicate checks — no changes'}</button>
    </form>
    {preview && <section className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-5 space-y-3">
      <div className="flex gap-2"><ShieldCheck className="text-blue-800 shrink-0" /><h2 className="text-lg font-bold">Review before creating</h2></div>
      <p className="text-sm">Original ID: <strong>{preview.id}</strong> · Class: <strong>{preview.schoolClass?.name || 'not found'}</strong> · Guardian: <strong>{preview.parent?.fullName || 'none selected'}</strong></p>
      {preview.parent && <p className="text-xs text-slate-700">Current children on selected Parent: {preview.parent.students.map(c => `${c.firstName} ${c.lastName} (${c.id})`).join(', ') || 'none'}</p>}
      {(preview.idMatches.length > 0 || preview.possibleDuplicates.length > 0) && <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-950"><strong>Stop — possible duplicate.</strong><ul className="list-disc list-inside mt-1">{[...preview.idMatches, ...preview.possibleDuplicates].map(c => <li key={c.id}>{c.id}: {c.firstName} {c.lastName} {c.class?.name || ''}</li>)}</ul></div>}
      {!preview.canCreate ? <p className="font-bold text-red-800">Creation blocked. Correct the data or investigate the possible duplicate first.</p> : <>
        {!preview.parent && <p className="text-sm font-bold text-amber-900">This student will have no Parent link until one is verified. No password is created.</p>}
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1" /><span>I verified this is a current missing student, the original ID, name, date of birth, class, and any selected Parent link.</span></label>
        <button type="button" disabled={!confirmed || busy} onClick={() => { if (window.confirm(`Create ONE Student with original ID ${preview.id}? No password will be issued.`)) void submit('create'); }}
          className="min-h-12 w-full rounded-xl bg-emerald-700 px-4 font-bold text-white disabled:opacity-50">{busy ? 'Checking...' : 'Create this one Student'}</button>
      </>}
    </section>}
  </main>;
}
