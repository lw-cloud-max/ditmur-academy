"use client";

import { useState, useEffect } from 'react';
import { School, BookOpen, Plus, Trash2, Loader2, AlertCircle, Calendar, ArrowRight, CheckCircle2, Star, CalendarRange } from 'lucide-react';

export default function ConfigurationPage() {
  const [activeTab, setActiveTab] = useState('classes');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // States for Classes
  const [classes, setClasses] = useState<any[]>([]);
  const [newClassName, setNewClassName] = useState('');
  const [newClassLevel, setNewClassLevel] = useState('Primary');
  const [loadingClasses, setLoadingClasses] = useState(true);

  // States for Subjects
  const [subjects, setSubjects] = useState<any[]>([]);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  // States for Terms/Sessions
  const [terms, setTerms] = useState<any[]>([]);
  const [loadingTerms, setLoadingTerms] = useState(true);
  const [newTerm, setNewTerm] = useState({ name: 'First Term', session: '2024-2025', isCurrent: false, startDate: '', endDate: '' });

  // States for Calendar Events
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [newEvent, setNewEvent] = useState({ title: '', type: 'GENERAL', date: '', description: '' });

  // States for Promotions
  const [sourceClass, setSourceClass] = useState('');
  const [targetClass, setTargetClass] = useState('');
  const [promotionStudents, setPromotionStudents] = useState<any[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [loadingPromotions, setLoadingPromotions] = useState(false);
  const [promoting, setPromoting] = useState(false);

  // Fetch data on load
  useEffect(() => {
    fetchClasses();
    fetchSubjects();
    fetchTerms();
    fetchEvents();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/classes');
      const data = await res.json();
      if (data.success) setClasses(data.data);
    } catch (err) { console.error(err); } finally { setLoadingClasses(false); }
  };

  const fetchSubjects = async () => {
    try {
      const res = await fetch('/api/subjects');
      const data = await res.json();
      if (data.success) setSubjects(data.data);
    } catch (err) { console.error(err); } finally { setLoadingSubjects(false); }
  };

  const fetchTerms = async () => {
    try {
      const res = await fetch('/api/terms');
      const data = await res.json();
      if (data.success) setTerms(data.data);
    } catch (err) { console.error(err); } finally { setLoadingTerms(false); }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/calendar');
      const data = await res.json();
      if (data.success) setEvents(data.data);
    } catch (err) { console.error(err); } finally { setLoadingEvents(false); }
  };

  // Create Handlers
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try {
      const res = await fetch('/api/classes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newClassName, level: newClassLevel }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewClassName(''); fetchClasses();
    } catch (err: any) { setError(err.message); }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try {
      const res = await fetch('/api/subjects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newSubjectName }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewSubjectName(''); fetchSubjects();
    } catch (err: any) { setError(err.message); }
  };

  const handleAddTerm = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try {
      const res = await fetch('/api/terms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newTerm) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewTerm({ name: 'First Term', session: '2024-2025', isCurrent: false, startDate: '', endDate: '' });
      fetchTerms();
    } catch (err: any) { setError(err.message); }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try {
      const res = await fetch('/api/calendar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newEvent) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewEvent({ title: '', type: 'GENERAL', date: '', description: '' });
      fetchEvents();
    } catch (err: any) { setError(err.message); }
  };

  // Delete Handlers
  const handleDeleteClass = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return;
    try { await fetch(`/api/classes?id=${id}`, { method: 'DELETE' }); fetchClasses(); } catch (err) {}
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;
    try { await fetch(`/api/subjects?id=${id}`, { method: 'DELETE' }); fetchSubjects(); } catch (err) {}
  };

  const handleDeleteTerm = async (id: string) => {
    if (!confirm('Delete this term?')) return;
    try { await fetch(`/api/terms?id=${id}`, { method: 'DELETE' }); fetchTerms(); } catch (err) {}
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    try { await fetch(`/api/calendar?id=${id}`, { method: 'DELETE' }); fetchEvents(); } catch (err) {}
  };

  const handleSetCurrentTerm = async (id: string) => {
    try { await fetch('/api/terms', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, isCurrent: true }) }); fetchTerms(); } catch (err) {}
  };

  // Promotions Logic
  useEffect(() => {
    if (!sourceClass) {
      setPromotionStudents([]);
      setSelectedStudentIds([]);
      return;
    }
    const fetchClassStudents = async () => {
      setLoadingPromotions(true);
      try {
        const res = await fetch(`/api/students?classId=${sourceClass}`);
        const data = await res.json();
        if (data.success) {
          setPromotionStudents(data.data);
          setSelectedStudentIds(data.data.map((s:any) => s.id)); // Select all by default
        }
      } catch(err) {} finally { setLoadingPromotions(false); }
    };
    fetchClassStudents();
  }, [sourceClass]);

  const handlePromoteStudents = async () => {
    if (!targetClass || selectedStudentIds.length === 0) return;
    if (sourceClass === targetClass) {
      alert("Source and Target classes must be different.");
      return;
    }
    setPromoting(true);
    setSuccessMsg('');
    try {
      const res = await fetch('/api/students/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: selectedStudentIds, targetClassId: targetClass })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message);
        setSourceClass('');
        setTargetClass('');
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Failed to promote");
    } finally {
      setPromoting(false);
    }
  };

  const toggleStudentSelection = (id: string) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter(sid => sid !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-32">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">System Configuration</h1>
        <p className="text-slate-500">Manage school-wide settings, academic calendars, and bulk student promotions.</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-2 text-sm font-medium"><AlertCircle className="w-5 h-5" /> {error}</div>}
      {successMsg && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="w-5 h-5" /> {successMsg}</div>}

      {/* Tabs */}
      <div className="flex overflow-x-auto custom-scrollbar gap-4 border-b border-slate-200">
        <button onClick={() => setActiveTab('classes')} className={`pb-4 px-2 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === 'classes' ? 'border-[#0033A0] text-[#0033A0]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Classes & Grades</button>
        <button onClick={() => setActiveTab('subjects')} className={`pb-4 px-2 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === 'subjects' ? 'border-[#0033A0] text-[#0033A0]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Academic Subjects</button>
        <button onClick={() => setActiveTab('terms')} className={`pb-4 px-2 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === 'terms' ? 'border-[#0033A0] text-[#0033A0]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Terms & Sessions</button>
        <button onClick={() => setActiveTab('calendar')} className={`pb-4 px-2 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === 'calendar' ? 'border-[#0033A0] text-[#0033A0]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>School Calendar</button>
        <button onClick={() => setActiveTab('promotions')} className={`pb-4 px-2 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === 'promotions' ? 'border-[#0033A0] text-[#0033A0]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Bulk Promotions</button>
      </div>

      {/* CLASSES TAB */}
      {activeTab === 'classes' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 text-[#0033A0] rounded-lg"><School className="w-5 h-5" /></div>
              <h2 className="text-lg font-bold text-slate-900">Add New Class</h2>
            </div>
            <form onSubmit={handleAddClass} className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Class Name</label><input type="text" required value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="e.g. Grade 10 - Science" className="w-full px-4 py-2 bg-slate-50 border rounded-lg text-sm outline-none" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Academic Level</label><select value={newClassLevel} onChange={(e) => setNewClassLevel(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border rounded-lg text-sm outline-none">
                <option value="Pre-Primary">Pre-Primary</option><option value="Primary">Primary</option><option value="Junior Secondary">Junior Secondary</option><option value="Senior Secondary">Senior Secondary</option>
              </select></div>
              <button type="submit" className="w-full flex justify-center items-center gap-2 bg-[#0033A0] text-white px-4 py-2.5 rounded-lg hover:bg-[#002277] font-medium text-sm"><Plus className="w-4 h-4" /> Create Class</button>
            </form>
          </div>
          <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200"><h3 className="font-bold text-slate-800">Existing Classes</h3></div>
            {loadingClasses ? (<div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>) : classes.length === 0 ? (<div className="p-8 text-center text-slate-500 text-sm">No classes found. Add one!</div>) : (
              <ul className="divide-y divide-slate-200 max-h-[600px] overflow-y-auto custom-scrollbar">
                {classes.map(c => (
                  <li key={c.id} className="flex items-center justify-between p-4 hover:bg-slate-50">
                    <div><p className="font-bold text-slate-900">{c.name}</p><p className="text-xs font-medium text-slate-500">{c.level} • {c._count?.students || 0} Students</p></div>
                    <button onClick={() => handleDeleteClass(c.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* SUBJECTS TAB */}
      {activeTab === 'subjects' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><BookOpen className="w-5 h-5" /></div>
              <h2 className="text-lg font-bold text-slate-900">Add New Subject</h2>
            </div>
            <form onSubmit={handleAddSubject} className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Subject Name</label><input type="text" required value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="e.g. Mathematics" className="w-full px-4 py-2 bg-slate-50 border rounded-lg text-sm outline-none" /></div>
              <button type="submit" className="w-full flex justify-center items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 font-medium text-sm"><Plus className="w-4 h-4" /> Create Subject</button>
            </form>
          </div>
          <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200"><h3 className="font-bold text-slate-800">Existing Subjects</h3></div>
            {loadingSubjects ? (<div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>) : subjects.length === 0 ? (<div className="p-8 text-center text-slate-500 text-sm">No subjects found. Add one!</div>) : (
              <ul className="divide-y divide-slate-200 max-h-[600px] overflow-y-auto custom-scrollbar grid grid-cols-2">
                {subjects.map(s => (
                  <li key={s.id} className="flex items-center justify-between p-4 hover:bg-slate-50 border-r border-slate-200 last:border-0">
                    <p className="font-medium text-slate-900">{s.name}</p>
                    <button onClick={() => handleDeleteSubject(s.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* TERMS & SESSIONS TAB */}
      {activeTab === 'terms' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Star className="w-5 h-5" /></div>
              <h2 className="text-lg font-bold text-slate-900">Add Term / Session</h2>
            </div>
            <form onSubmit={handleAddTerm} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Academic Session</label>
                <input type="text" required value={newTerm.session} onChange={(e) => setNewTerm({...newTerm, session: e.target.value})} placeholder="e.g. 2024-2025" className="w-full px-4 py-2 bg-slate-50 border rounded-lg text-sm outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Term</label>
                <select value={newTerm.name} onChange={(e) => setNewTerm({...newTerm, name: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border rounded-lg text-sm outline-none">
                  <option value="First Term">First Term</option>
                  <option value="Second Term">Second Term</option>
                  <option value="Third Term">Third Term</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label><input type="date" value={newTerm.startDate} onChange={(e) => setNewTerm({...newTerm, startDate: e.target.value})} className="w-full px-2 py-2 bg-slate-50 border rounded-lg text-sm outline-none" /></div>
                <div><label className="block text-xs font-medium text-slate-700 mb-1">End Date</label><input type="date" value={newTerm.endDate} onChange={(e) => setNewTerm({...newTerm, endDate: e.target.value})} className="w-full px-2 py-2 bg-slate-50 border rounded-lg text-sm outline-none" /></div>
              </div>
              <label className="flex items-center gap-2 mt-4 cursor-pointer">
                <input type="checkbox" checked={newTerm.isCurrent} onChange={(e) => setNewTerm({...newTerm, isCurrent: e.target.checked})} className="w-4 h-4 text-[#0033A0] rounded border-slate-300" />
                <span className="text-sm font-medium text-slate-700">Set as Current Term</span>
              </label>
              <button type="submit" className="w-full flex justify-center items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 font-medium text-sm mt-4"><Plus className="w-4 h-4" /> Save Term</button>
            </form>
          </div>
          <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200"><h3 className="font-bold text-slate-800">Academic History</h3></div>
            {loadingTerms ? (<div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>) : terms.length === 0 ? (<div className="p-8 text-center text-slate-500 text-sm">No terms configured yet.</div>) : (
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-slate-50 border-b"><th className="p-4 text-xs uppercase text-slate-500">Session & Term</th><th className="p-4 text-xs uppercase text-slate-500">Dates</th><th className="p-4 text-xs uppercase text-slate-500">Status</th><th className="p-4 text-xs uppercase text-slate-500 text-right">Actions</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {terms.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="p-4"><p className="font-bold text-slate-900">{t.session}</p><p className="text-sm text-slate-600">{t.name}</p></td>
                      <td className="p-4 text-sm text-slate-500">{t.startDate ? new Date(t.startDate).toLocaleDateString() : '-'} to {t.endDate ? new Date(t.endDate).toLocaleDateString() : '-'}</td>
                      <td className="p-4">
                        {t.isCurrent ? <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">CURRENT</span> : 
                        <button onClick={() => handleSetCurrentTerm(t.id)} className="text-xs font-bold text-[#0033A0] hover:underline">Set Current</button>}
                      </td>
                      <td className="p-4 text-right"><button onClick={() => handleDeleteTerm(t.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* CALENDAR TAB */}
      {activeTab === 'calendar' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Calendar className="w-5 h-5" /></div>
              <h2 className="text-lg font-bold text-slate-900">Add School Event</h2>
            </div>
            <form onSubmit={handleAddEvent} className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Event Title</label><input type="text" required value={newEvent.title} onChange={(e) => setNewEvent({...newEvent, title: e.target.value})} placeholder="e.g. Mid-Term Break Begins" className="w-full px-4 py-2 bg-slate-50 border rounded-lg text-sm outline-none" /></div>
              
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label><input type="date" required value={newEvent.date} onChange={(e) => setNewEvent({...newEvent, date: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border rounded-lg text-sm outline-none" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">End Date</label><input type="date" value={(newEvent as any).endDate || ''} onChange={(e) => setNewEvent({...newEvent, endDate: e.target.value} as any)} className="w-full px-4 py-2 bg-slate-50 border rounded-lg text-sm outline-none" /></div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Event Type</label>
                <select value={newEvent.type} onChange={(e) => setNewEvent({...newEvent, type: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border rounded-lg text-sm outline-none">
                  <option value="GENERAL">General Assembly / Event</option>
                  <option value="HOLIDAY">Public Holiday / Break</option>
                  <option value="EXAM">Examination</option>
                  <option value="academic">Academic / Resumption</option>
                  <option value="holiday">Holiday / Mid-Term Break</option>
                  <option value="meeting">Meeting / PTA</option>
                </select>
              </div>
              <button type="submit" className="w-full flex justify-center items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-lg hover:bg-amber-600 font-medium text-sm mt-4"><Plus className="w-4 h-4" /> Save Event</button>
            </form>
          </div>
          <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200"><h3 className="font-bold text-slate-800">Upcoming Events</h3></div>
            {loadingEvents ? (<div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>) : events.length === 0 ? (<div className="p-8 text-center text-slate-500 text-sm">No upcoming events scheduled.</div>) : (
              <ul className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {events.map(ev => (
                  <li key={ev.id} className="flex items-center justify-between p-4 hover:bg-slate-50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 flex flex-col items-center justify-center shrink-0 border border-slate-200 text-slate-500">
                        <span className="text-[10px] uppercase font-bold">{new Date(ev.date).toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-lg font-black leading-none">{new Date(ev.date).getDate()}</span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{ev.title}</p>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${ev.type === 'HOLIDAY' ? 'bg-red-100 text-red-700' : ev.type === 'EXAM' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-700'}`}>{ev.type}</span>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteEvent(ev.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* PROMOTIONS TAB */}
      {activeTab === 'promotions' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 animation-fade-in">
          <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-6">
            <div className="p-3 bg-blue-100 text-[#0033A0] rounded-xl"><ArrowRight className="w-6 h-6" /></div>
            <div><h2 className="text-xl font-bold text-slate-900">Bulk Student Promotions</h2><p className="text-sm text-slate-500">Transfer an entire class of students to a new class level for the new session.</p></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
              <label className="block text-sm font-bold text-slate-700 mb-2">1. Select Source Class</label>
              <select value={sourceClass} onChange={e => setSourceClass(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-medium">
                <option value="">-- Choose Class --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <p className="text-xs text-slate-500 mt-2">These students will be moved.</p>
            </div>
            
            <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100">
              <label className="block text-sm font-bold text-blue-900 mb-2">2. Select Destination Class</label>
              <select value={targetClass} onChange={e => setTargetClass(e.target.value)} className="w-full px-4 py-3 bg-white border border-blue-300 rounded-lg outline-none focus:border-blue-500 font-medium text-blue-900 shadow-sm">
                <option value="">-- Choose Destination --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <p className="text-xs text-[#0033A0] mt-2">Where the selected students will go.</p>
            </div>
          </div>

          {sourceClass && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Students to Promote ({selectedStudentIds.length} selected)</h3>
                <button onClick={handlePromoteStudents} disabled={promoting || selectedStudentIds.length === 0 || !targetClass} className={`px-6 py-2 rounded-lg font-bold text-sm text-white flex items-center gap-2 transition-colors ${promoting || selectedStudentIds.length === 0 || !targetClass ? 'bg-blue-400 cursor-not-allowed' : 'bg-[#0033A0] hover:bg-[#002277] shadow-md'}`}>
                  {promoting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />} Execute Promotion
                </button>
              </div>
              {loadingPromotions ? (
                <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" /></div>
              ) : promotionStudents.length === 0 ? (
                <div className="p-12 text-center text-slate-500 font-medium">No students in the selected source class.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <tbody className="divide-y divide-slate-100">
                    {promotionStudents.map(stu => (
                      <tr key={stu.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 w-12 text-center">
                          <input type="checkbox" checked={selectedStudentIds.includes(stu.id)} onChange={() => toggleStudentSelection(stu.id)} className="w-4 h-4 text-[#0033A0] rounded border-slate-300 cursor-pointer" />
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">{stu.firstName} {stu.lastName}</td>
                        <td className="px-4 py-3 text-sm text-slate-500 font-mono">{stu.id}</td>
                        <td className="px-6 py-3 text-right">
                          <span className="text-xs font-bold text-slate-400 uppercase">{stu.gender}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
