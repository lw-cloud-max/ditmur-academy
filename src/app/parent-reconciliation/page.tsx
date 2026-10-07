'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AlertTriangle, ArrowLeft, FileSpreadsheet, LockKeyhole, RefreshCw, Search, ShieldCheck, UploadCloud } from 'lucide-react';
import { parseRoster, previewRoster, type ExistingParent, type ExistingStudent, type RosterEntry } from '@/lib/parent-reconciliation';

type Data = { parents: ExistingParent[]; students: ExistingStudent[] };
export default function ParentReconciliationPage() {
  const { data: session, status } = useSession();
  const admin = session?.user?.role === 'ADMIN' && session.user.id === 'admin-1';
  const [data, setData] = useState<Data | null>(null);
  const [entries, setEntries] = useState<RosterEntry[]>([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all'|'review'|'consolidation'|'existing'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!admin) return;
    let active = true;
    fetch('/api/parent-reconciliation', { cache: 'no-store' }).then(async response => {
      if (!response.ok) throw Error('Could not load school records. Sign in again as super admin.');
      return response.json();
    }).then(result => { if (active) setData(result); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Could not load school records.'); });
    return () => { active = false; };
  }, [admin]);
  const suggestions = useMemo(() => data ? previewRoster(entries, data.students, data.parents) : [], [data, entries]);
  const totals = useMemo(() => ({
    review: suggestions.filter(s => s.kind === 'review').length,
    consolidation: suggestions.filter(s => s.kind === 'consolidation').length,
    existing: suggestions.filter(s => s.kind === 'existing').length,
    exactChildren: suggestions.flatMap(s => s.children).filter(c => c.matches.length === 1).length,
    possibleChildren: suggestions.flatMap(s => s.children).filter(c => c.matches.length === 0 && c.possible.length > 0).length,
    missingChildren: suggestions.flatMap(s => s.children).filter(c => c.matches.length === 0 && c.possible.length === 0).length
  }), [suggestions]);
  const shown = suggestions.filter(item => (filter === 'all' || item.kind === filter) &&
    (!search || [item.row.name, item.row.email, ...item.row.children, ...item.parents.map(p => p.fullName)]
      .some(text => text.toLowerCase().includes(search.toLowerCase()))));
  async function loadFile(file: File | undefined) {
    setEntries([]); setFileName(''); setError('');
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) { setError('In Excel, choose Save As > CSV UTF-8 (Comma delimited). Do not upload an .xlsx file.'); return; }
    if (file.size > 2_000_000) { setError('CSV exceeds 2 MB. Split it into smaller files.'); return; }
    setLoading(true);
    try {
      const parsed = parseRoster(await file.text());
      if (!parsed.length) throw Error('No guardian rows found.');
      setEntries(parsed); setFileName(file.name);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not read CSV.'); }
    finally { setLoading(false); }
  }
  if (status === 'loading') return <main className="p-6 text-slate-600">Checking access...</main>;
  if (!admin) return <main className="max-w-xl mx-auto p-6"><LockKeyhole className="mb-3 text-amber-700" /><h1 className="font-bold text-xl">Super admin only</h1><p>Parent roster preview is not available to other accounts.</p></main>;
  return <main className="max-w-6xl mx-auto px-4 py-6 sm:px-6 space-y-5 pb-20">
    <Link href="/parents" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-800"><ArrowLeft size={16} /> Back to Parents</Link>
    <div className="rounded-3xl bg-[#092652] text-white p-6 sm:p-8">
      <div className="flex items-center gap-3"><FileSpreadsheet className="text-amber-300" /><span className="uppercase text-xs tracking-widest text-amber-200 font-bold">School records · audit</span></div>
      <h1 className="text-2xl sm:text-3xl font-black mt-3">Parent roster preview</h1>
      <p className="text-blue-100 mt-2 max-w-3xl">Compare Excel families with existing Parent and Student records before any import. Every match is a suggestion requiring human review.</p>
    </div>
    <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 text-emerald-950 p-4 flex items-start gap-3">
      <ShieldCheck className="shrink-0 mt-0.5" /><p className="text-sm"><strong>Preview only. No Apply button.</strong> The CSV stays in this browser tab; it is not sent to the school server, saved, emailed, or logged by this page. Existing accounts, children, passwords and invoices are not changed.</p>
    </div>
    <div className="grid lg:grid-cols-2 gap-4">
      <section className="rounded-2xl bg-white border border-slate-200 p-5 space-y-3">
        <h2 className="font-bold text-lg">1. Save a copy as CSV UTF-8</h2>
        <p className="text-sm text-slate-600">In Excel, use <strong>Save As → CSV UTF-8 (Comma delimited)</strong>. Keep the original workbook. The “Linked students” cell may contain numbered names on separate lines.</p>
        <p className="text-xs text-slate-600">Required headings: First Name, Surname, Email, Phone, Linked students. Other name, S/NO, Gender and Occupation are accepted but not used for matching. Limit: 1,000 rows / 2 MB.</p>
        <label className="flex items-center justify-center gap-2 cursor-pointer min-h-12 rounded-xl bg-blue-800 text-white font-semibold px-4 text-center hover:bg-blue-900">
          <UploadCloud size={18} /> Choose CSV file
          <input className="sr-only" type="file" accept=".csv,text/csv" onChange={event => { void loadFile(event.target.files?.[0]); event.target.value = ''; }} />
        </label>
        {loading && <p className="text-sm">Reading file locally...</p>}
        {fileName && <p className="text-xs break-all text-slate-600">Loaded locally: {fileName}</p>}
      </section>
      <section className="rounded-2xl bg-white border border-slate-200 p-5 space-y-3">
        <h2 className="font-bold text-lg">2. Review, do not merge yet</h2>
        <p className="text-sm text-slate-600">Names alone cannot prove identity. Confirm the guardian, every child, any existing account login and its history. A family absent from this roster is <strong>not</strong> automatically a duplicate.</p>
        <p className="text-sm text-amber-800 flex gap-2"><AlertTriangle size={18} className="shrink-0" /> Do not send this spreadsheet or screenshots with guardian details in chat.</p>
        {data && <p className="text-sm text-slate-600">Comparison loaded: {data.parents.length} Parent records, {data.students.length} Student records.</p>}
      </section>
    </div>
    {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 text-red-900 p-4 text-sm">{error}</p>}
    {entries.length > 0 && data && <>
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2" aria-label="Preview counts">
        {[['Roster families', entries.length], ['Needs review', totals.review], ['Several Parent records', totals.consolidation], ['One Parent candidate', totals.existing]].map(([label, value]) =>
          <div key={label} className="rounded-xl border bg-white p-4"><p className="text-2xl font-black text-blue-900">{value}</p><p className="text-xs text-slate-600 font-medium">{label}</p></div>)}
      </section>
      <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950"><strong>Name diagnostic:</strong> {totals.exactChildren} children with one exact Student match; {totals.possibleChildren} with name-based possibilities requiring manual review; {totals.missingChildren} with no two-token candidate. Ambiguous exact names are not counted in these three numbers. Possible matches are never used to link or merge Parent accounts.</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <label className="relative flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><span className="sr-only">Search preview</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search preview" className="w-full pl-10 pr-3 h-11 rounded-xl border border-slate-300 bg-white" /></label>
        <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)} aria-label="Filter preview" className="h-11 rounded-xl border border-slate-300 bg-white px-3">
          <option value="all">All rows</option><option value="review">Needs review</option><option value="consolidation">Several Parent records</option><option value="existing">One Parent candidate</option>
        </select>
        <button type="button" onClick={() => { setEntries([]); setFileName(''); setSearch(''); }} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 flex items-center justify-center gap-2"><RefreshCw size={16}/>Clear preview</button>
      </div>
      <p className="text-xs text-slate-600">Showing {Math.min(50, shown.length)} of {shown.length} filtered rows. Search or filter to find more. No result is automatically approved.</p>
      <div className="space-y-3">{shown.slice(0, 50).map((item, i) => <article key={item.row.line + '-' + i} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold text-slate-900">Roster row {item.row.line}: {item.row.name || '(name missing)'}</h3><span className={`text-xs font-bold rounded-full px-3 py-1 ${item.kind === 'review' ? 'bg-amber-100 text-amber-900' : item.kind === 'consolidation' ? 'bg-blue-100 text-blue-900' : 'bg-slate-100 text-slate-800'}`}>{item.kind === 'review' ? 'Needs review' : item.kind === 'consolidation' ? 'Several records — review' : 'One candidate — review'}</span></div>
        <p className="text-xs text-slate-600 break-all">Roster contact: {item.row.email || '(no email)'} · {item.row.phone || '(no phone)'}</p>
        {item.flags.length > 0 && <ul className="list-disc list-inside text-xs text-amber-900 bg-amber-50 rounded-lg p-3">{item.flags.map(flag => <li key={flag}>{flag}</li>)}</ul>}
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div><h4 className="font-semibold text-slate-800 mb-2">Listed children</h4>{item.children.length ? <ul className="space-y-2">{item.children.map((child, j) => <li key={j} className="rounded-lg bg-slate-50 p-2"><strong>{child.name}</strong><span className="block text-xs text-slate-600">{child.matches.length === 1 ? `Exact unique: ${child.matches[0].id} · ${child.matches[0].class?.name || 'class not set'} · current Parent ${child.matches[0].parentId || 'none'}` : child.matches.length === 0 ? 'No exact unique name match — manual review' : `${child.matches.length} students share this exact name — manual review`}</span>{child.matches.length === 0 && child.possible.length > 0 && <div className="mt-2 border-t border-amber-200 pt-2 text-xs text-amber-950"><strong>Possible Students — verify in school records; NOT confirmed:</strong><ul className="mt-1 space-y-1">{child.possible.map(student => <li key={student.id}>{student.firstName} {student.otherNames || ''} {student.lastName} · {student.id} · {student.class?.name || 'class not set'} · Parent {student.parentId || 'none'}</li>)}</ul></div>}</li>)}</ul> : <p className="text-slate-600">None listed</p>}</div>
          <div><h4 className="font-semibold text-slate-800 mb-2">Possible existing Parent records</h4>{item.parents.length ? <ul className="space-y-2">{item.parents.map(parent => <li key={parent.id} className="rounded-lg bg-slate-50 p-2 break-words"><strong>{parent.fullName}</strong><span className="block text-xs text-slate-600 break-all">ID {parent.id} · {parent.students.length} linked student(s) · {parent.email || 'no email'} · {parent.phone || 'no phone'}</span></li>)}</ul> : <p className="text-slate-600">None suggested. Do not create a new record without verifying.</p>}</div>
        </div>
      </article>)}</div>
    </>}
  </main>;
}
