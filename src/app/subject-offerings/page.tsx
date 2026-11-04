"use client";

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, CheckCircle2, Loader2, Save, Search, Users } from 'lucide-react';

type SchoolClass = { id: string; name: string; level: string; teacherId?: string | null };
type Subject = { id: string; name: string };
type StudentOffering = { id: string; firstName: string; lastName: string; subjectIds: string[]; suggestedSubjectIds: string[] };

export default function SubjectOfferingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const isSuperAdmin = session?.user?.role === 'ADMIN' && session.user.id === 'admin-1';
  const isClassTeacher = session?.user?.role === 'STAFF' && ['TEACHER', 'ACCOUNTANT_TEACHER'].includes(session.user.staffRole || '');
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<StudentOffering[]>([]);
  const [terms, setTerms] = useState<string[]>(['Term 1 - 2024']);
  const [classId, setClassId] = useState('');
  const [term, setTerm] = useState('Term 1 - 2024');
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [defaultSubjectIds, setDefaultSubjectIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [rosterLoad, setRosterLoad] = useState<{ key: string; loading: boolean; error: string }>({ key: '', loading: false, error: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const rosterKey = `${classId}:${term}`;
  const loadingRoster = !!classId && (rosterLoad.key !== rosterKey || rosterLoad.loading);
  const rosterError = rosterLoad.key === rosterKey ? rosterLoad.error : '';

  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !(isSuperAdmin || isClassTeacher)) return;
    let active = true;
    Promise.all([
      fetch('/api/classes', { cache: 'no-store' }).then(response => response.json()),
      fetch('/api/subjects', { cache: 'no-store' }).then(response => response.json()),
      fetch('/api/terms', { cache: 'no-store' }).then(response => response.json())
    ]).then(([classResult, subjectResult, termResult]) => {
      if (!active) return;
      if (!classResult.success) throw new Error(classResult.error || 'Could not load classes');
      if (!subjectResult.success) throw new Error(subjectResult.error || 'Could not load subjects');
      if (!termResult.success) throw new Error(termResult.error || 'Could not load terms');
      const permittedClasses = isSuperAdmin ? classResult.data : classResult.data.filter((item: SchoolClass) => item.teacherId === session?.user?.id);
      setClasses(permittedClasses);
      setSubjects(subjectResult.data);
      const termOptions = Array.from(new Set(['Term 1 - 2024', ...termResult.data.map((item: { name: string; session: string }) => `${item.name} ${item.session}`)]));
      setTerms(termOptions);
      const current = termResult.data.find((item: { name: string; session: string; isCurrent: boolean }) => item.isCurrent);
      if (current) setTerm(`${current.name} ${current.session}`);
      if (permittedClasses.length) setClassId(permittedClasses[0].id);
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load setup choices'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sessionStatus, isSuperAdmin, isClassTeacher, session?.user?.id]);

  useEffect(() => {
    if (!classId || !term) return;
    let active = true;
    fetch(`/api/student-subject-offerings?classId=${encodeURIComponent(classId)}&term=${encodeURIComponent(term)}`, { cache: 'no-store' })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Could not load subject offerings');
        if (!active) return;
        const roster = result.data.students as StudentOffering[];
        setStudents(roster);
        const next: Record<string, string[]> = {};
        for (const student of roster) next[student.id] = student.subjectIds.length ? student.subjectIds : student.suggestedSubjectIds;
        setSelections(next);
        setRosterLoad({ key: rosterKey, loading: false, error: '' });
      })
      .catch(cause => {
        if (!active) return;
        setStudents([]); setSelections({});
        setRosterLoad({ key: rosterKey, loading: false, error: cause instanceof Error ? cause.message : 'Could not load subject offerings' });
      });
    return () => { active = false; };
  }, [classId, term, rosterKey]);

  const filteredStudents = useMemo(() => students.filter(student =>
    `${student.firstName} ${student.lastName} ${student.id}`.toLowerCase().includes(search.toLowerCase())), [students, search]);
  const assignedCount = students.filter(student => (selections[student.id] || []).length > 0).length;

  const toggleSubject = (studentId: string, subjectId: string) => {
    setSelections(previous => {
      const current = new Set(previous[studentId] || []);
      if (current.has(subjectId)) current.delete(subjectId); else current.add(subjectId);
      return { ...previous, [studentId]: Array.from(current) };
    });
  };

  const toggleDefaultSubject = (subjectId: string) => setDefaultSubjectIds(previous => previous.includes(subjectId)
    ? previous.filter(id => id !== subjectId) : [...previous, subjectId]);
  const applyToAll = () => {
    if (!defaultSubjectIds.length) { setError('Choose at least one default subject first.'); return; }
    if (!window.confirm('Apply the selected default subjects to every active student in this class? You can still adjust each student afterward. Existing grades that would be hidden will block the save.')) return;
    setSelections(Object.fromEntries(students.map(student => [student.id, [...defaultSubjectIds]])));
    setError('');
  };

  const save = async () => {
    if (!classId || !term || !students.length || saving) return;
    if (students.some(student => !(selections[student.id] || []).length)) {
      setError('Select at least one subject for every student before saving.');
      return;
    }
    if (!window.confirm(`Save subject offerings for ${students.length} student(s) in ${classes.find(item => item.id === classId)?.name || 'this class'} for ${term}? Existing grades will not be deleted; a selection that would hide grades is rejected.`)) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/student-subject-offerings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, term, confirmed: true,
          offerings: students.map(student => ({ studentId: student.id, subjectIds: selections[student.id] || [] })) })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not save subject offerings');
      setMessage(result.message || 'Subject offerings saved.');
      setStudents(previous => previous.map(student => ({ ...student, subjectIds: selections[student.id] || [] })));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save subject offerings'); }
    finally { setSaving(false); }
  };

  if (sessionStatus === 'loading') return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-700" /></div>;
  if (!isSuperAdmin && !isClassTeacher) return <div className="mx-auto max-w-3xl rounded-xl border bg-white p-6 text-slate-700">Only an assigned class teacher or super admin can manage subject offerings.</div>;
  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-700" /></div>;

  return <div className="mx-auto max-w-6xl space-y-6 pb-32">
    <Link href="/broadsheet" className="inline-flex items-center gap-2 text-sm font-bold text-[#0033A0]"><ArrowLeft className="h-4 w-4" /> Back to Broadsheet</Link>
    <header className="rounded-2xl bg-gradient-to-r from-[#0A192F] to-[#0033A0] p-6 text-white">
      <h1 className="flex items-center gap-2 text-2xl font-black"><BookOpen className="h-6 w-6" /> Student Subject Offerings</h1>
      <p className="mt-2 text-sm text-blue-100">Choose subjects per student and term. The broadsheet will use only these subjects. Existing grade records are kept; a change that would hide a grade is blocked.</p>
    </header>
    {(error || rosterError) && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error || rosterError}</p>}
    {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"><CheckCircle2 className="mr-2 inline h-5 w-5" />{message}</p>}

    <section className="grid grid-cols-1 gap-4 rounded-2xl border bg-white p-4 sm:grid-cols-2">
      <label className="text-sm font-semibold text-slate-800">Class
        <select value={classId} onChange={event => setClassId(event.target.value)} className="mt-1 block w-full rounded-lg border p-3 bg-white">
          {classes.map(item => <option key={item.id} value={item.id}>{item.name} — {item.level}</option>)}
        </select>
      </label>
      <label className="text-sm font-semibold text-slate-800">Term
        <select value={term} onChange={event => setTerm(event.target.value)} className="mt-1 block w-full rounded-lg border p-3 bg-white">
          {terms.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
    </section>

    <section className="rounded-2xl border bg-white p-4 sm:p-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-700"><Users className="h-4 w-4" /> {assignedCount} of {students.length} students currently have at least one subject selected.</div>
        <div className="flex flex-wrap gap-2">
          <label className="relative min-w-[220px] flex-1 sm:flex-none"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Find student" className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm" />
          </label>
          <details className="w-full rounded-lg border border-blue-200 bg-blue-50 p-3">
            <summary className="cursor-pointer text-sm font-bold text-blue-900">Choose a common starting set (optional)</summary>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {subjects.map(subject => <label key={subject.id} className="flex items-center gap-2 rounded-lg bg-white p-2 text-sm text-slate-700">
                <input type="checkbox" checked={defaultSubjectIds.includes(subject.id)} onChange={() => toggleDefaultSubject(subject.id)} />{subject.name}
              </label>)}
            </div>
            <button type="button" onClick={applyToAll} disabled={!students.length || !defaultSubjectIds.length} className="mt-3 rounded-lg bg-blue-800 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Apply to all students</button>
          </details>
        </div>
      </div>
      {loadingRoster ? <div className="p-10 flex justify-center"><Loader2 className="h-7 w-7 animate-spin text-blue-700" /></div> : students.length === 0 ? <p className="rounded-lg bg-slate-50 p-6 text-center text-slate-600">No active students in this class.</p> : <div className="space-y-3">
        {filteredStudents.map(student => {
          const selected = new Set(selections[student.id] || []);
          return <details key={student.id} className="rounded-xl border border-slate-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
              <span className="min-w-0"><strong className="block truncate text-slate-900">{student.firstName} {student.lastName}</strong><span className="text-xs text-slate-500">{student.id}</span></span>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${selected.size ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{selected.size} selected</span>
            </summary>
            <div className="grid grid-cols-1 gap-2 border-t p-4 sm:grid-cols-2 lg:grid-cols-3">
              {subjects.map(subject => <label key={subject.id} className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-100 p-2 text-sm text-slate-700 hover:bg-slate-50">
                <input type="checkbox" checked={selected.has(subject.id)} onChange={() => toggleSubject(student.id, subject.id)} />{subject.name}
              </label>)}
            </div>
          </details>;
        })}
      </div>}
      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">For older terms with existing grades, the page suggests those subjects by default. Saving replaces the offering list, never the grades.</p>
        <button type="button" onClick={save} disabled={saving || loadingRoster || !students.length || assignedCount !== students.length} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-5 py-3 font-bold text-white disabled:opacity-50">
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}{saving ? 'Saving…' : 'Save Subject Offerings'}
        </button>
      </div>
    </section>
  </div>;
}
