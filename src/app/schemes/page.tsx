"use client";

import { useState, useEffect } from 'react';
import { Search, Plus, BookOpen, Loader2, Trash2, Library, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function SchemesPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('Junior Secondary');
  
  const [schemes, setSchemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [newScheme, setNewScheme] = useState({
    week: 1,
    topic: '',
    objectives: ''
  });

  const fetchSubjects = async () => {
    try {
      const res = await fetch('/api/subjects');
      const data = await res.json();
      if (data.success) {
        setSubjects(data.data);
        if (data.data.length > 0) setSelectedSubject(data.data[0].id);
      }
    } catch (err) {}
  };

  useEffect(() => { fetchSubjects(); }, []);

  const fetchSchemes = async () => {
    if (!selectedSubject || !selectedLevel) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/schemes?subjectId=${selectedSubject}&level=${selectedLevel}`);
      const data = await res.json();
      if (data.success) setSchemes(data.data);
    } catch (err) {} finally { setLoading(false); }
  };

  useEffect(() => { fetchSchemes(); }, [selectedSubject, selectedLevel]);

  const handleSaveScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/schemes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newScheme, subjectId: selectedSubject, level: selectedLevel })
      });
      const data = await res.json();
      if (data.success) {
        setNewScheme({ week: newScheme.week + 1, topic: '', objectives: '' });
        setIsAdding(false);
        fetchSchemes();
      } else alert(data.error);
    } catch (err) {
      alert("Failed to save scheme");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this scheme?")) return;
    try {
      await fetch(`/api/schemes?id=${id}`, { method: 'DELETE' });
      setSchemes(schemes.filter(s => s.id !== id));
    } catch (err) {}
  };

  return (
    <div className="space-y-6 pb-32 max-w-5xl mx-auto animation-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ministry Scheme of Work</h1>
          <p className="text-slate-500">Manage standard curriculum for all academic levels.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">1. Select Subject</label>
          <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-[#0033A0] outline-none">
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">2. Academic Level</label>
          <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 outline-none">
            <option value="Pre-Primary">Pre-Primary</option>
            <option value="Primary">Primary</option>
            <option value="Junior Secondary">Junior Secondary</option>
            <option value="Senior Secondary">Senior Secondary</option>
          </select>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex gap-3 justify-between items-center bg-white p-4 border border-slate-200 rounded-xl shadow-sm flex-wrap">
          <div>
            <h2 className="font-bold text-slate-800 flex items-center gap-2"><Library className="w-4 h-4 text-[#0033A0]"/> Curriculum Record</h2>
            <p className="text-xs text-slate-500">{schemes.length} weeks configured</p>
          </div>
          <button onClick={() => setIsAdding(!isAdding)} className="flex items-center gap-2 bg-[#0033A0] text-white px-4 py-2 rounded-lg hover:bg-[#002277] font-medium text-sm">
            <Plus className="w-4 h-4" /> Add Week
          </button>
        </div>

        {isAdding && (
          <div className="bg-blue-50/50 rounded-xl border border-blue-200 p-6 relative">
            <h3 className="font-bold text-[#0033A0] mb-4">Add Scheme Entry</h3>
            <form onSubmit={handleSaveScheme} className="space-y-4">
              <div className="flex gap-4">
                <div className="w-32 shrink-0">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Week</label>
                  <input type="number" min="1" max="52" required value={newScheme.week} onChange={e => setNewScheme({...newScheme, week: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded-md text-sm outline-none" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Topic</label>
                  <input type="text" required value={newScheme.topic} onChange={e => setNewScheme({...newScheme, topic: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm outline-none" placeholder="e.g. Introduction to Algebra" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Objectives / Content</label>
                <textarea value={newScheme.objectives} onChange={e => setNewScheme({...newScheme, objectives: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm outline-none resize-none h-24" placeholder="Students should be able to..." />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsAdding(false)} className="px-5 py-2 text-slate-600 bg-slate-100 rounded-lg text-sm font-bold">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-[#0033A0] text-white rounded-lg text-sm font-bold flex items-center gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Scheme</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
           <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" /></div>
        ) : schemes.length === 0 && !isAdding ? (
          <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-12 text-center text-slate-500">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-900">No scheme found for this subject and level.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {schemes.map((s) => (
              <div key={s.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative group flex gap-4">
                <div className="w-16 h-16 rounded-lg bg-slate-50 border border-slate-200 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Week</span>
                  <span className="text-2xl font-black text-[#0033A0]">{s.week}</span>
                </div>
                <div className="flex-1 pr-12">
                  <h4 className="font-bold text-slate-900 text-lg mb-2">{s.topic}</h4>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{s.objectives}</p>
                </div>
                <button onClick={() => handleDelete(s.id)} className="absolute top-4 right-4 p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
