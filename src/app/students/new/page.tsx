"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, CheckCircle2, Loader2, Save, UserPlus, Users } from 'lucide-react';
import Link from 'next/link';

type SchoolClass = { id: string; name: string; level: string; teacherId?: string | null };
type ParentMatch = { id: string; fullName: string; email: string | null; phone: string };

export default function NewStudentPage() {
  const { data: session, status: sessionStatus } = useSession();
  const params = useSearchParams();
  const isSuperAdmin = session?.user?.role === 'ADMIN' && session.user.id === 'admin-1';
  const isClassTeacher = session?.user?.role === 'STAFF' && ['TEACHER', 'ACCOUNTANT_TEACHER'].includes(session.user.staffRole || '');
  const initialClassId = params.get('classId') || '';
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState('');
  const [parentMatches, setParentMatches] = useState<ParentMatch[]>([]);
  const [selectedParentId, setSelectedParentId] = useState('');
  const [confirmNewParent, setConfirmNewParent] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', otherNames: '', dob: '', gender: '',
    parentFullName: '', parentEmail: '', parentPhone: ''
  });

  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !(isSuperAdmin || isClassTeacher)) return;
    let active = true;
    fetch('/api/classes', { cache: 'no-store' })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Could not load classes');
        const assigned = isSuperAdmin ? result.data : result.data.filter((item: SchoolClass) => item.teacherId === session?.user?.id);
        if (!active) return;
        setClasses(assigned);
        if (initialClassId && assigned.some((item: SchoolClass) => item.id === initialClassId)) setSelectedClass(initialClassId);
        else if (assigned.length) setSelectedClass(assigned[0].id);
      })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load classes'); })
      .finally(() => { if (active) setLoadingClasses(false); });
    return () => { active = false; };
  }, [sessionStatus, isSuperAdmin, isClassTeacher, session?.user?.id, initialClassId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedClass || saving) return;
    setSaving(true); setError(''); setNotice(''); setSuccess('');
    try {
      const response = await fetch('/api/students/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, classId: selectedClass,
          parentId: selectedParentId || null,
          confirmedParentMatch: !!selectedParentId,
          confirmedNewParent: confirmNewParent && !selectedParentId })
      });
      const result = await response.json();
      if (response.status === 409 && result.needsParentChoice && Array.isArray(result.matches)) {
        setParentMatches(result.matches);
        setSelectedParentId(''); setConfirmNewParent(false);
        setNotice(result.error || 'An existing Parent matches these contacts. Review and choose it below.');
        return;
      }
      if (response.status === 409 && result.needsNewParentConfirmation) {
        setParentMatches([]); setSelectedParentId('');
        setNotice(result.error || 'Confirm that this is a new guardian before continuing.');
        return;
      }
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not add student');
      setSuccess(result.message || `Student ${result.data?.studentId} added. No login password was issued.`);
      setForm({ firstName: '', lastName: '', otherNames: '', dob: '', gender: '', parentFullName: '', parentEmail: '', parentPhone: '' });
      setParentMatches([]); setSelectedParentId(''); setConfirmNewParent(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add the student.');
    } finally { setSaving(false); }
  };

  if (sessionStatus === 'loading') return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-700" /></div>;
  if (!isSuperAdmin && !isClassTeacher) return <div className="mx-auto max-w-3xl rounded-xl border bg-white p-6 text-slate-700">Only an assigned class teacher or the super admin can add a student.</div>;
  if (loadingClasses) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-700" /></div>;

  return <div className="mx-auto max-w-4xl space-y-6 pb-32">
    <Link href="/students" className="inline-flex items-center gap-2 text-sm font-bold text-[#0033A0]"><ArrowLeft className="h-4 w-4" /> Back to Students</Link>
    <header className="rounded-2xl bg-gradient-to-r from-[#0A192F] to-[#0033A0] p-6 text-white">
      <h1 className="flex items-center gap-2 text-2xl font-black"><UserPlus className="h-6 w-6" /> Add New Student</h1>
      <p className="mt-2 text-sm text-blue-100">Student ID is generated automatically. No parent or student login password is created here.</p>
    </header>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>}
    {notice && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950"><p className="font-semibold">{notice}</p></div>}
    {success && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"><CheckCircle2 className="mr-2 inline h-5 w-5" />{success}
      <div className="mt-3 flex gap-3"><Link href="/students" className="font-bold underline">View Students</Link><Link href="/subject-offerings" className="font-bold underline">Set Subject Offerings</Link></div>
    </div>}

    <form onSubmit={submit} className="space-y-5 rounded-2xl border bg-white p-5 sm:p-7 shadow-sm">
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Student details</h2>
        <label className="block text-sm font-semibold">Class
          <select required value={selectedClass} onChange={event => setSelectedClass(event.target.value)} className="mt-1 block w-full rounded-lg border p-3 bg-white" disabled={!isSuperAdmin}>
            <option value="">Select assigned class</option>{classes.map(item => <option key={item.id} value={item.id}>{item.name} — {item.level}</option>)}
          </select>
          {isClassTeacher && !isSuperAdmin && <span className="mt-1 block text-xs text-slate-500">You can add students only to your assigned class.</span>}
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">First name<input required maxLength={80} value={form.firstName} onChange={event => setForm({ ...form, firstName: event.target.value })} className="mt-1 block w-full rounded-lg border p-3" /></label>
          <label className="block text-sm font-semibold">Surname<input required maxLength={80} value={form.lastName} onChange={event => setForm({ ...form, lastName: event.target.value })} className="mt-1 block w-full rounded-lg border p-3" /></label>
          <label className="block text-sm font-semibold">Other names (optional)<input maxLength={120} value={form.otherNames} onChange={event => setForm({ ...form, otherNames: event.target.value })} className="mt-1 block w-full rounded-lg border p-3" /></label>
          <label className="block text-sm font-semibold">Date of birth<input type="date" required value={form.dob} onChange={event => setForm({ ...form, dob: event.target.value })} className="mt-1 block w-full rounded-lg border p-3" /></label>
          <label className="block text-sm font-semibold">Gender<select required value={form.gender} onChange={event => setForm({ ...form, gender: event.target.value })} className="mt-1 block w-full rounded-lg border p-3 bg-white"><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option></select></label>
        </div>
      </section>

      <section className="space-y-4 border-t pt-5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Users className="h-5 w-5" /> Parent / Guardian details</h2>
        <p className="text-sm text-slate-600">We check existing Parent records by contact details before creating anything. Existing records are never merged or overwritten by this form.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold sm:col-span-2">Parent / guardian full name<input required maxLength={160} value={form.parentFullName} onChange={event => setForm({ ...form, parentFullName: event.target.value })} className="mt-1 block w-full rounded-lg border p-3" /></label>
          <label className="block text-sm font-semibold">Email (optional)<input type="email" maxLength={180} value={form.parentEmail} onChange={event => { setForm({ ...form, parentEmail: event.target.value }); setSelectedParentId(''); setParentMatches([]); setConfirmNewParent(false); setNotice(''); }} className="mt-1 block w-full rounded-lg border p-3" /></label>
          <label className="block text-sm font-semibold">Phone<input type="tel" required maxLength={25} value={form.parentPhone} onChange={event => { setForm({ ...form, parentPhone: event.target.value }); setSelectedParentId(''); setParentMatches([]); setConfirmNewParent(false); setNotice(''); }} placeholder="080… or +234…" className="mt-1 block w-full rounded-lg border p-3" /></label>
        </div>

        {parentMatches.length > 0 && <fieldset className="space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <legend className="px-1 font-bold text-blue-950">Select the existing Parent record</legend>
          {parentMatches.map(parent => <label key={parent.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border bg-white p-3 ${selectedParentId === parent.id ? 'border-blue-700 ring-2 ring-blue-200' : 'border-slate-200'}`}>
            <input type="radio" name="existing-parent" checked={selectedParentId === parent.id} onChange={() => { setSelectedParentId(parent.id); setConfirmNewParent(false); }} className="mt-1" />
            <span><strong>{parent.fullName}</strong><span className="block text-sm text-slate-600">{parent.email || 'No email'} · {parent.phone}</span><span className="block text-xs text-slate-500">Parent ID: {parent.id}</span></span>
          </label>)}
          {selectedParentId && <p className="text-sm text-blue-900">The student will be linked to the selected existing Parent. No Parent details or login will be changed.</p>}
        </fieldset>}

        {notice && notice.toLowerCase().includes('new guardian') && parentMatches.length === 0 && <label className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <input type="checkbox" checked={confirmNewParent} onChange={event => setConfirmNewParent(event.target.checked)} className="mt-1" />
          I checked the contact details. This is a new guardian record; create it without issuing a login password.
        </label>}
        {parentMatches.length > 0 && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Select one existing Parent above to confirm the link. Their details and login will not be changed.</p>}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">A new Parent and Student will have no login password. Ask the super admin to provision logins separately when needed.</div>
      </section>

      <button type="submit" disabled={saving || !selectedClass || (parentMatches.length > 0 && !selectedParentId) || (notice.toLowerCase().includes('new guardian') && !confirmNewParent)} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-5 py-3 font-bold text-white disabled:opacity-50">
        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
        {saving ? 'Saving student…' : 'Add Student'}
      </button>
      <p className="text-xs text-slate-500">New student creation is logged to the school database. Please verify names, date of birth, class and guardian contact details before confirming.</p>
    </form>
  </div>;
}
