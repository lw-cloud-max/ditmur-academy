"use client";

import { useState, useEffect } from 'react';
import { MonitorPlay, Clock, Calendar, Plus, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function EntranceExamPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '', description: '', scheduledDate: '', startTime: '', durationMinutes: 60
  });

  const fetchExams = async () => {
    try {
      const res = await fetch('/api/exams');
      const data = await res.json();
      if (data.success) setExams(data.data);
    } catch (error) { console.error("Failed to fetch exams"); } finally { setLoading(false); }
  };

  useEffect(() => { fetchExams(); }, []);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      const res = await fetch('/api/exams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setFormData({ title: '', description: '', scheduledDate: '', startTime: '', durationMinutes: 60 });
        fetchExams();
      } else alert(data.error);
    } catch (err) { alert("Failed to create exam"); } finally { setIsSubmitting(false); }
  };

  const handleDeleteExam = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete the entrance exam "${title}"?`)) return;
    try {
      const res = await fetch(`/api/exams?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) setExams(exams.filter(e => e.id !== id));
      else alert(data.error);
    } catch (err) { alert("Failed to delete exam"); }
  };

  return (
    <div className="space-y-6 pb-32">
      <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Entrance Exams (CBT)</h1>
          <p className="text-slate-500">Manage computer-based tests for external candidates.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-[#0033A0] text-white px-4 py-2 rounded-lg hover:bg-[#002277] font-medium text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create New Exam
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" /></div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4"><MonitorPlay className="w-8 h-8" /></div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No entrance exams configured</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => (
            <div key={exam.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative group">
              
              {/* VISIBLE DELETE BUTTON */}
              <button onClick={() => handleDeleteExam(exam.id, exam.title)} className="absolute top-4 right-4 p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-red-100">
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-50 text-[#0033A0] rounded-lg"><MonitorPlay className="w-5 h-5" /></div>
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-1 pr-10">{exam.title}</h3>
              <p className="text-sm text-slate-500 line-clamp-1">{exam.description || "No description provided."}</p>
              
              <div className="space-y-2 mt-5 text-sm text-slate-600 font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" /><span>{new Date(exam.scheduledDate).toLocaleDateString()}</span></div>
                <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /><span>{exam.startTime} ({exam.durationMinutes} mins)</span></div>
              </div>

              <div className="mt-5 pt-5 border-t border-slate-100 flex gap-3">
                <Link href={`/entrance-exam/${exam.id}`} className="flex-1 bg-[#0A192F] hover:bg-[#060F1D] text-white text-center py-2.5 rounded-lg text-sm font-medium transition-colors">
                  Manage Questions
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-[#0A192F]/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Configure Entrance Exam</h3>
            </div>
            <form onSubmit={handleCreateExam} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Exam Title</label><input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border rounded-lg text-sm outline-none" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border rounded-lg text-sm outline-none resize-none h-20" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Date</label><input type="date" required value={formData.scheduledDate} onChange={e => setFormData({...formData, scheduledDate: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border rounded-lg text-sm outline-none" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label><input type="time" required value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border rounded-lg text-sm outline-none" /></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Duration (Minutes)</label><input type="number" required min="10" value={formData.durationMinutes} onChange={e => setFormData({...formData, durationMinutes: parseInt(e.target.value)})} className="w-full px-4 py-2 bg-slate-50 border rounded-lg text-sm outline-none" /></div>
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
    </div>
  );
}
