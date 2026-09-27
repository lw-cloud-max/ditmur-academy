"use client";

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { BookOpen, FileDown, Loader2, Sparkles, Trash2 } from 'lucide-react';

type Lookup = { id: string; name: string };
type Note = {
  id: string; title: string; week: number; status: string; fileName?: string | null;
  subject: Lookup; class: Lookup; updatedAt: string;
  lessonNote?: string | null; evaluation?: string | null; assignment?: string | null; hasFile?: boolean;
};
const blank = { title: '', subjectId: '', classId: '', week: 1, lessonNote: '', evaluation: '', assignment: '' };

export default function LessonNotesManager() {
  const { data: session, status: sessionStatus } = useSession();
  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Lookup[]>([]);
  const [classes, setClasses] = useState<Lookup[]>([]);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [attachedName, setAttachedName] = useState('');
  const [removeFile, setRemoveFile] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [instructions, setInstructions] = useState('');
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const reload = async () => {
    const res = await fetch('/api/lesson-notes', { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Could not load lesson notes');
    setNotes(data.data);
  };
  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !['STAFF','ADMIN'].includes(session?.user?.role || '')) return;
    Promise.all([
      fetch('/api/subjects').then(r => r.json()),
      fetch('/api/classes').then(r => r.json()),
      fetch('/api/lesson-notes', { cache: 'no-store' }).then(r => r.json())
    ]).then(([s,c,n]) => {
      if (s.success) setSubjects(s.data);
      if (c.success) setClasses(c.data);
      if (n.success) setNotes(n.data);
      else setError(n.error || 'Could not load lesson notes');
    }).catch(() => setError('Could not load subjects, classes or notes')).finally(() => setLoading(false));
  }, [sessionStatus, session?.user?.role]);

  const reset = () => {
    setEditingId(null); setForm(blank); setFile(null); setAttachedName('');
    setRemoveFile(false); setInstructions(''); setError('');
    if (fileInput.current) fileInput.current.value = '';
  };
  const edit = async (id: string) => {
    setBusy(true); setError(''); setMessage('');
    try {
      const res = await fetch(`/api/lesson-notes?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not load note');
      const n: Note & { subjectId: string; classId: string } = data.data;
      setForm({ title: n.title, subjectId: n.subjectId, classId: n.classId, week: n.week,
        lessonNote: n.lessonNote || '', evaluation: n.evaluation || '', assignment: n.assignment || '' });
      setEditingId(id); setAttachedName(n.hasFile ? n.fileName || '' : '');
      setFile(null); setRemoveFile(false);
      if (fileInput.current) fileInput.current.value = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load note'); }
    finally { setBusy(false); }
  };
  const generate = async () => {
    if (!form.title.trim() || !form.subjectId || !form.classId) {
      setError('Select a subject and class, then enter the topic before generating.'); return;
    }
    if ((form.lessonNote || form.evaluation || form.assignment) &&
        !window.confirm('Replace the current lesson note, evaluation and assignment with the AI draft?')) return;
    setGenerating(true); setError(''); setMessage('');
    try {
      const res = await fetch('/api/lesson-notes/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId: form.subjectId, classId: form.classId,
          topic: form.title, instructions })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Generation failed');
      setForm(previous => ({ ...previous, ...data.data }));
      setMessage('Draft generated. Review all three fields, then save or publish.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Generation failed'); }
    finally { setGenerating(false); }
  };
  const save = async (status: 'DRAFT' | 'PUBLISHED') => {
    setError(''); setMessage('');
    if (file && file.size > 3 * 1024 * 1024) { setError('File cannot exceed 3 MB.'); return; }
    if (!form.title.trim() || !form.subjectId || !form.classId ||
        (!form.lessonNote.trim() && !file && (!attachedName || removeFile))) {
      setError('Enter a topic, subject, class and note text or attach a file.'); return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      for (const [key, value] of Object.entries(form)) body.append(key, String(value));
      body.append('status', status);
      if (file) body.append('file', file);
      if (removeFile) body.append('removeFile', 'true');
      const url = editingId ? `/api/lesson-notes?id=${encodeURIComponent(editingId)}` : '/api/lesson-notes';
      const res = await fetch(url, { method: editingId ? 'PUT' : 'POST', body });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not save note');
      reset();
      await reload();
      setMessage(status === 'PUBLISHED' ? 'Published. Students in the selected class can now see the note in Study Hub.' : 'Draft saved. Students cannot see it yet.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save note'); }
    finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    if (!window.confirm('Delete this lesson note and attachment permanently?')) return;
    setError(''); setMessage(''); setBusy(true);
    try {
      const res = await fetch(`/api/lesson-notes?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not delete note');
      if (editingId === id) reset();
      await reload(); setMessage('Note deleted.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not delete note'); }
    finally { setBusy(false); }
  };

  if (sessionStatus === 'loading') return <div className="p-8"><Loader2 className="animate-spin" /></div>;
  if (!['ADMIN', 'STAFF'].includes(session?.user?.role || '')) {
    return <div className="p-8 text-slate-700">Only teachers and admins can manage lesson notes. Students can read published notes in Study Hub.</div>;
  }
  const input = 'w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600';
  return <div className="max-w-6xl mx-auto pb-28 space-y-6">
    <header><h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><BookOpen className="text-blue-700" /> Lesson Notes</h1>
      <p className="text-sm text-slate-600 mt-1">Type a note, attach a file, or generate the note, evaluation and assignment in one AI request. Publish when ready.</p></header>
    {error && <p role="alert" className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl">{error}</p>}
    {message && <p role="status" className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl">{message}</p>}
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3"><h2 className="font-bold text-lg">{editingId ? 'Edit lesson note' : 'New lesson note'}</h2>
        {editingId && <button type="button" onClick={reset} className="text-sm font-bold text-blue-700">New note instead</button>}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="text-sm font-semibold">Subject *<select className={`${input} mt-1`} value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })}>
          <option value="">Choose subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label className="text-sm font-semibold">Class *<select className={`${input} mt-1`} value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value })}>
          <option value="">Choose class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="text-sm font-semibold sm:col-span-2">Topic / title *<input maxLength={200} className={`${input} mt-1`} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Fractions: adding unlike denominators" /></label>
        <label className="text-sm font-semibold">Week (optional)<input type="number" min="1" max="52" className={`${input} mt-1`} value={form.week} onChange={e => setForm({ ...form, week: Number(e.target.value) })} /></label>
      </div>
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
        <label className="block text-sm font-semibold text-blue-900">AI instructions (optional, all in one prompt)
          <textarea className={`${input} mt-1 min-h-24`} maxLength={2000} value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="e.g. Explain with local examples, use 3 worked examples, and generate 5 evaluation questions plus a short assignment." /></label>
        <button type="button" onClick={generate} disabled={generating || busy} className="w-full sm:w-auto rounded-xl bg-blue-800 text-white px-5 py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-60">
          {generating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />} Generate note + evaluation + assignment
        </button>
        <p className="text-xs text-blue-800">AI output is editable and is not published automatically. Requires OPENAI_API_KEY.</p>
      </div>
      <label className="block text-sm font-semibold">Lesson note / content
        <textarea className={`${input} mt-1 min-h-64 font-normal whitespace-pre-wrap`} maxLength={30000} value={form.lessonNote} onChange={e => setForm({ ...form, lessonNote: e.target.value })} placeholder="Type the lesson note here, or attach a document below." /></label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block text-sm font-semibold">Evaluation questions<textarea className={`${input} mt-1 min-h-36 font-normal`} maxLength={8000} value={form.evaluation} onChange={e => setForm({ ...form, evaluation: e.target.value })} placeholder="1. ..." /></label>
        <label className="block text-sm font-semibold">Assignment<textarea className={`${input} mt-1 min-h-36 font-normal`} maxLength={8000} value={form.assignment} onChange={e => setForm({ ...form, assignment: e.target.value })} placeholder="1. ..." /></label>
      </div>
      <div className="rounded-xl border border-slate-200 p-4 space-y-2">
        <label htmlFor="lesson-note-file" className="block text-sm font-semibold">Optional document: PDF, DOCX or PPTX (max 3 MB)</label>
        <input id="lesson-note-file" ref={fileInput} type="file" accept=".pdf,.docx,.pptx" onChange={e => { setFile(e.target.files?.[0] || null); setRemoveFile(false); }} className="block w-full text-sm" />
        {attachedName && !file && !removeFile && <div className="text-sm">Attached: {attachedName} <button type="button" className="ml-2 text-red-700 font-bold" onClick={() => setRemoveFile(true)}>Remove</button></div>}
        {removeFile && <button type="button" className="text-sm text-blue-700 font-bold" onClick={() => setRemoveFile(false)}>Undo remove attachment</button>}
      </div>
      <div className="flex flex-col sm:flex-row gap-3"><button type="button" disabled={busy || generating} onClick={() => save('DRAFT')} className="rounded-xl bg-slate-200 text-slate-800 px-6 py-3 font-bold disabled:opacity-60">Save draft</button>
        <button type="button" disabled={busy || generating} onClick={() => save('PUBLISHED')} className="rounded-xl bg-green-700 text-white px-6 py-3 font-bold disabled:opacity-60">{busy ? 'Saving...' : 'Publish to selected class'}</button></div>
    </section>
    <section className="space-y-3"><h2 className="font-bold text-lg">Your lesson notes</h2>
      {loading ? <Loader2 className="animate-spin text-blue-700" /> : notes.length === 0 ? <p className="rounded-xl border bg-white p-6 text-slate-600">No notes yet. Create one above.</p> :
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{notes.map(note => <article key={note.id} className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex justify-between gap-2"><h3 className="font-bold text-slate-900">{note.title}</h3><span className={`text-xs font-bold ${note.status === 'PUBLISHED' ? 'text-green-700' : 'text-amber-700'}`}>{note.status}</span></div>
          <p className="text-sm text-slate-600 mt-1">{note.subject.name} · {note.class.name} · Week {note.week}</p>
          {note.fileName && <p className="text-xs text-slate-500 mt-1">File: {note.fileName}</p>}
          <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => edit(note.id)} className="rounded-lg bg-blue-50 text-blue-800 px-4 py-2 text-sm font-bold">Edit / view</button>
            {note.fileName && <a href={`/api/lesson-notes/${encodeURIComponent(note.id)}/file`} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold flex items-center gap-1"><FileDown size={16} /> Download</a>}
            <button type="button" onClick={() => remove(note.id)} className="rounded-lg bg-red-50 text-red-700 px-4 py-2 text-sm font-bold flex items-center gap-1"><Trash2 size={16} /> Delete</button></div>
        </article>)}</div>}
    </section>
  </div>;
}
