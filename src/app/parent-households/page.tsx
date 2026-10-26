'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowLeft, CheckCircle2, Loader2, RefreshCw, ShieldCheck, Users, AlertTriangle } from 'lucide-react';

type HouseholdStudent = { id: string; firstName: string; lastName: string; classId: string | null; class: { name: string } | null };
type HouseholdParent = { id: string; fullName: string; email: string | null; phone: string; students: HouseholdStudent[];
  _count: { tickets: number; conversations: number; smsNotifications: number } };
type Group = { groupKey: string; email: string; phone: string; parents: HouseholdParent[] };
type Review = { keeperId: string; studentIds: string[] };

export default function ParentHouseholdsPage() {
  const { data: session, status } = useSession();
  const superAdmin = session?.user?.role === 'ADMIN' && session.user.id === 'admin-1';
  const [groups, setGroups] = useState<Group[]>([]);
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/parent-households', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not load family matches');
      const rows = Array.isArray(data.data) ? data.data as Group[] : [];
      setGroups(rows);
      setReviews(previous => Object.fromEntries(rows.map(group => {
        const current = previous[group.groupKey];
        const parentIds = new Set(group.parents.map(parent => parent.id));
        const activeIds = new Set(group.parents.flatMap(parent => parent.students.map(student => student.id)));
        const keeperId = current && parentIds.has(current.keeperId) ? current.keeperId : group.parents[0].id;
        const studentIds = current ? current.studentIds.filter(id => activeIds.has(id)) :
          group.parents.filter(parent => parent.id !== keeperId).flatMap(parent => parent.students.map(student => student.id));
        return [group.groupKey, { keeperId, studentIds }];
      })));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load family matches'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (superAdmin) void refresh(); }, [superAdmin]);

  const visible = useMemo(() => groups.filter(group =>
    [group.email, group.phone, ...group.parents.flatMap(parent => [parent.fullName, ...parent.students.map(student => `${student.firstName} ${student.lastName}`)])]
      .some(value => value.toLowerCase().includes(search.toLowerCase()))), [groups, search]);

  const updateKeeper = (group: Group, keeperId: string) => {
    setReviews(previous => ({ ...previous, [group.groupKey]: {
      keeperId,
      studentIds: group.parents.filter(parent => parent.id !== keeperId).flatMap(parent => parent.students.map(student => student.id))
    } }));
  };
  const toggleStudent = (groupKey: string, studentId: string) => {
    setReviews(previous => {
      const current = previous[groupKey]; if (!current) return previous;
      const next = current.studentIds.includes(studentId) ? current.studentIds.filter(id => id !== studentId) : [...current.studentIds, studentId];
      return { ...previous, [groupKey]: { ...current, studentIds: next } };
    });
  };
  const applyGroup = async (group: Group) => {
    const review = reviews[group.groupKey];
    const keeper = group.parents.find(parent => parent.id === review?.keeperId);
    if (!keeper || !review.studentIds.length) { setError('Choose a keeper Parent and at least one active student to link.'); return; }
    const studentNames = group.parents.flatMap(parent => parent.students).filter(student => review.studentIds.includes(student.id))
      .map(student => `${student.firstName} ${student.lastName}`).join(', ');
    if (!window.confirm(`Link ${review.studentIds.length} selected active student(s) (${studentNames}) to ${keeper.fullName}?\n\nThis uses an exact matching email AND phone suggestion. Confirm these are all the same real guardian. Existing Parent accounts will not be deleted. Parent-specific tickets/chats/SMS history stays with its original account.`)) return;
    setSaving(group.groupKey); setError(''); setNotice('');
    try {
      const response = await fetch('/api/parent-households', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keeperId: keeper.id, studentIds: review.studentIds, confirmed: true }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not link family');
      setNotice(data.message || 'Selected students linked. Parent records/history retained.');
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not link family'); }
    finally { setSaving(null); }
  };

  if (status === 'loading') return <main className="p-6 text-slate-600">Checking access...</main>;
  if (!superAdmin) return <main className="mx-auto max-w-xl p-6"><ShieldCheck className="mb-3 text-amber-700"/><h1 className="text-xl font-bold">Super admin only</h1><p>Household reconciliation is restricted to the super admin.</p></main>;
  const candidateRows = groups.reduce((sum, group) => sum + group.parents.length, 0);
  const candidateChildren = groups.reduce((sum, group) => sum + group.parents.reduce((count, parent) => count + parent.students.length, 0), 0);

  return <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 pb-28 sm:px-6">
    <Link href="/parents" className="inline-flex items-center gap-2 text-sm font-bold text-blue-800"><ArrowLeft size={16}/> Back to Parents</Link>
    <header className="rounded-2xl bg-[#0A192F] p-6 text-white"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-200"><Users size={16}/> Super admin · account reconciliation</div>
      <h1 className="mt-3 text-2xl font-black">Possible sibling households</h1>
      <p className="mt-2 max-w-3xl text-sm text-blue-100">Find separate Parent accounts whose verified email and phone both match exactly. Review each child and select one account to keep using. No one is linked automatically.</p>
    </header>
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><AlertTriangle className="mt-0.5 shrink-0"/><p><strong>Review carefully:</strong> shared contact details are a suggestion, not proof. Check the real guardian and every selected child privately before confirming. Unmatched or unlinked students do not appear in these groups.</p></div>
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"><strong>History is preserved.</strong> Linking changes only a Student&apos;s Parent account reference. Duplicate Parent records, messages, tickets and SMS history are retained; they are not merged or deleted.</div>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {[['Possible family groups',groups.length],['Parent records in groups',candidateRows],['Active linked students',candidateChildren]].map(([label,count])=><div key={label} className="rounded-xl border bg-white p-4"><p className="text-2xl font-black text-blue-900">{count}</p><p className="text-xs font-medium text-slate-600">{label}</p></div>)}
    </section>
    <div className="flex flex-col gap-2 sm:flex-row">
      <input aria-label="Search candidate families" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search guardian, email, phone or child" className="min-h-11 min-w-0 flex-1 rounded-xl border bg-white px-3" />
      <button type="button" onClick={()=>void refresh()} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border bg-white px-4 font-semibold text-blue-900"><RefreshCw size={16} className={loading?'animate-spin':''}/> Refresh matches</button>
    </div>
    {loading ? <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-700"/></div>
      : visible.length===0 ? <div className="rounded-xl border bg-white p-8 text-center text-slate-600">{groups.length===0?'No current candidate sibling groups match both email and phone. Update verified Parent contact details, then refresh.':'No candidate families match this search.'}</div>
      : <div className="space-y-4">{visible.map(group=>{
        const review=reviews[group.groupKey]||{keeperId:group.parents[0]?.id||'',studentIds:[]};
        const selectedCount=review.studentIds.length;
        return <article key={group.groupKey} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="break-all text-sm text-slate-700"><strong>Exact matching contacts:</strong> {group.email} · {group.phone}</div>
          <fieldset className="mt-4 space-y-3"><legend className="text-sm font-bold text-slate-900">Parent accounts in this possible family</legend>
            {group.parents.map(parent=><div key={parent.id} className={`min-w-0 rounded-xl border p-3 ${review.keeperId===parent.id?'border-blue-500 bg-blue-50':'border-slate-200'}`}>
              <label className="flex min-w-0 cursor-pointer items-start gap-3"><input type="radio" name={`keeper-${group.groupKey}`} checked={review.keeperId===parent.id} onChange={()=>updateKeeper(group,parent.id)} className="mt-1 shrink-0"/>
                <span className="min-w-0 flex-1"><strong className="break-words text-slate-900">{parent.fullName}</strong><span className="block break-all text-xs text-slate-600">{parent.email||'no email'} · {parent.phone}</span>
                  <span className="mt-1 block text-xs text-slate-500">Record {parent.id} · {parent.students.length} active linked student(s) · {parent._count.tickets} ticket(s), {parent._count.conversations} conversation(s), {parent._count.smsNotifications} SMS record(s)</span></span>
              </label>
              {parent.students.length>0&&<ul className="ml-7 mt-2 space-y-1">{parent.students.map(student=><li key={student.id} className="flex min-w-0 items-start gap-2 text-sm"><input type="checkbox" checked={review.studentIds.includes(student.id)} onChange={()=>toggleStudent(group.groupKey,student.id)} aria-label={`Link ${student.firstName} ${student.lastName} to selected Parent`} className="mt-1 shrink-0"/><span className="min-w-0 break-words"><strong>{student.firstName} {student.lastName}</strong><span className="text-slate-600"> · {student.id} · {student.class?.name||'class not set'} · currently linked to {parent.fullName}</span></span></li>)}</ul>}
            </div>)}
          </fieldset>
          {group.parents.some(parent=>parent._count.tickets+parent._count.conversations+parent._count.smsNotifications>0)&&<p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-950">Some selected source accounts have Parent-only history. This tool deliberately leaves that history on the original account so no messages or tickets are lost.</p>}
          <button type="button" onClick={()=>void applyGroup(group)} disabled={!selectedCount||saving===group.groupKey} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 font-bold text-white disabled:opacity-50 sm:w-auto">{saving===group.groupKey?<Loader2 className="h-4 w-4 animate-spin"/>:<CheckCircle2 size={17}/>} Link {selectedCount} selected student(s) to chosen Parent</button>
        </article>;
      })}</div>}
  </main>;
}
