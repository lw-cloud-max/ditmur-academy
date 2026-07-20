"use client";

import { useState, useEffect } from 'react';
import { MonitorPlay, Clock, Plus, Loader2, Trash2, BookOpen, ToggleRight, ToggleLeft, Library, Database } from 'lucide-react';
import Link from 'next/link';
import QuestionBankTab from './QuestionBankTab';

export default function InternalExamPage() {
  const [activeTab, setActiveTab] = useState('exams');

  const [exams, setExams] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '', classId: '', subjectId: '', durationMinutes: 60, shuffleQuestions: false
  });

  const fetchData = async () => {
    try {
      const [eRes, cRes, sRes] = await Promise.all([
        fetch('/api/internal-exams'),
        fetch('/api/classes'),
        fetch('/api/subjects')
      ]);
      const eData = await eRes.json();
      const cData = await cRes.json();
      const sData = await sRes.json();
      
      if (eData.success) setExams(eData.data);
      if (cData.success) setClasses(cData.data);
      if (sData.success) setSubjects(sData.data);
    } catch (error) { console.error("Failed to fetch data"); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      const res = await fetch('/api/internal-exams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setFormData({ title: '', classId: '', subjectId: '', durationMinutes: 60, shuffleQuestions: false });
        fetchData();
      } else alert(data.error);
    } catch (err) { alert("Failed to create exam"); } finally { setIsSubmitting(false); }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await fetch('/api/internal-exams', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, isActive: !currentStatus }) });
      fetchData();
    } catch (err) {}
  };

  const handleDeleteExam = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) return;
    try {
      const res = await fetch(`/api/internal-exams?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) setExams(exams.filter(e => e.id !== id));
      else alert(data.error);
    } catch (err) { alert("Failed to delete exam"); }
  };

  return (
    <div className="space-y-6 pb-32 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Internal Exams (CBT)</h1>
          <p className="text-slate-500">Manage termly computer-based tests and global question banks.</p>
        </div>
        {activeTab === 'exams' && (
          <button onClick={() => setIsModalOpen(true)} className="bg-[#0033A0] text-white px-4 py-2 rounded-lg hover:bg-[#002277] font-medium text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Internal Exam
          </button>
        )}
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        <button onClick={() => setActiveTab('exams')} className={`pb-4 px-2 text-sm font-bold transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'exams' ? 'border-[#0033A0] text-[#0033A0]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          <MonitorPlay className="w-4 h-4" /> Live Exams
        </button>
        <button onClick={() => setActiveTab('bank')} className={`pb-4 px-2 text-sm font-bold transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'bank' ? 'border-[#0033A0] text-[#0033A0]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          <Database className="w-4 h-4" /> Global Question Bank
        </button>
      </div>

      {activeTab === 'exams' ? (
        <>
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" /></div>
          ) : exams.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4"><MonitorPlay className="w-8 h-8" /></div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No internal exams configured</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map((exam) => (
                <div key={exam.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative group">
                  <button onClick={() => handleDeleteExam(exam.id, exam.title)} className="absolute top-4 right-4 p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-red-100 opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-indigo-50 text-[#0033A0] rounded-lg"><MonitorPlay className="w-5 h-5" /></div>
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg mb-1 pr-12">{exam.title}</h3>
                  <p className="text-sm font-bold text-[#0033A0] mb-6">{exam.class?.name} • {exam.subject?.name}</p>
                  
                  <div className="space-y-2 mt-5 text-sm text-slate-600 font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /><span>{exam.durationMinutes} mins</span></div>
                      <div className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-slate-400" /><span>{exam._count?.questions || 0} Qs</span></div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between items-center p-3 rounded-lg border border-slate-200">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Exam Status</span>
                    <button onClick={() => handleToggleActive(exam.id, exam.isActive)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${exam.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                      {exam.isActive ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4" />}
                      {exam.isActive ? 'ACTIVE' : 'HIDDEN'}
                    </button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex gap-3">
                    <Link href={`/internal-exams/${exam.id}`} className="flex-1 bg-[#0A192F] hover:bg-[#060F1D] text-white text-center py-2.5 rounded-lg text-sm font-medium transition-colors">
                      Manage Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isModalOpen && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900">Create Internal Exam</h3>
                </div>
                <form onSubmit={handleCreateExam} className="p-6 space-y-4">
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Exam Title</label><input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border rounded-lg text-sm outline-none" placeholder="e.g. JSS 1 Math Mid-Term" /></div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Target Class</label>
                      <select required value={formData.classId} onChange={e => setFormData({...formData, classId: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm outline-none">
                        <option value="">Select Class...</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                      <select required value={formData.subjectId} onChange={e => setFormData({...formData, subjectId: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm outline-none">
                        <option value="">Select Subject...</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Duration (Minutes)</label><input type="number" required min="10" value={formData.durationMinutes} onChange={e => setFormData({...formData, durationMinutes: parseInt(e.target.value)})} className="w-full px-4 py-2 bg-slate-50 border rounded-lg text-sm outline-none" /></div>
                  
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <input type="checkbox" checked={formData.shuffleQuestions} onChange={e => setFormData({...formData, shuffleQuestions: e.target.checked})} className="w-4 h-4 text-blue-600 rounded cursor-pointer" />
                    <label className="text-sm font-bold text-blue-900 cursor-pointer">Shuffle Questions & Answers for each student</label>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-colors">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-[#0033A0] hover:bg-[#002277] text-white rounded-lg font-medium text-sm transition-colors flex justify-center items-center gap-2">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Exam'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      ) : (
        <QuestionBankTab classes={classes} subjects={subjects} />
      )}
    </div>
  );
}
