"use client";

import { useState, useEffect } from 'react';
import { Save, BookOpen, Plus, Loader2, Search, Filter, Trash2, Edit2, FileText, CheckCircle2, ChevronDown, ChevronUp, Sparkles, Wand2, Library } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function LessonPlanPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isReadOnly = userRole !== 'STAFF' && userRole !== 'ADMIN';

  const [plans, setPlans] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState('');
  
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isSyncingScheme, setIsSyncingScheme] = useState(false);

  const [formData, setFormData] = useState({
    title: '', week: 1, classId: '', subjectId: '', teacherId: '', 
    schemeOfWork: '', lessonNote: '', evaluation: '', assignment: '', status: 'SUBMITTED'
  });

  const fetchData = async () => {
    try {
      let defaultClassId = null;
      if (userRole === 'STUDENT' && session?.user?.id) {
        const stRes = await fetch(`/api/student-dashboard?studentId=${encodeURIComponent(session.user.id)}`);
        const stData = await stRes.json();
        if (stData.success && stData.data?.student?.classId) {
          defaultClassId = stData.data.student.classId;
        }
      } else if (userRole === 'PARENT' && session?.user?.id) {
        const pRes = await fetch('/api/parents');
        const pData = await pRes.json();
        if (pData.success) {
          const parent = pData.data.find((p: any) => p.id === session.user.id);
          if (parent && parent.students && parent.students.length > 0) {
            defaultClassId = parent.students[0].classId;
          }
        }
      }

      const [pRes, cRes, sRes, tRes] = await Promise.all([
        fetch('/api/lesson-plans'), fetch('/api/classes'), fetch('/api/subjects'), fetch('/api/staff')
      ]);
      const pData = await pRes.json(); const cData = await cRes.json();
      const sData = await sRes.json(); const tData = await tRes.json();
      
      if (cData.success) {
        setClasses(cData.data);
        if (defaultClassId) setSelectedClass(defaultClassId);
      }
      if (pData.success) setPlans(pData.data);
      if (sData.success) setSubjects(sData.data);
      if (tData.success) setStaff(tData.data.filter((t:any) => t.role === 'TEACHER'));
    } catch (error) { console.error("Failed to fetch data"); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      const res = await fetch('/api/lesson-plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setFormData({ title: '', week: 1, classId: '', subjectId: '', teacherId: '', schemeOfWork: '', lessonNote: '', evaluation: '', assignment: '', status: 'SUBMITTED' });
        fetchData();
      } else alert(data.error);
    } catch (err) { alert("Failed to create lesson plan"); } finally { setIsSubmitting(false); }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm(`Delete this lesson plan permanently?`)) return;
    try {
      await fetch(`/api/lesson-plans?id=${id}`, { method: 'DELETE' });
      setPlans(plans.filter(p => p.id !== id));
    } catch (err) {}
  };

  const handleSyncMinistryScheme = async () => {
    if (!formData.classId || !formData.subjectId || !formData.week) {
      alert("Please select a Class, Subject, and Week to synchronize.");
      return;
    }
    
    setIsSyncingScheme(true);
    try {
      const res = await fetch('/api/lesson-plans/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: formData.classId, subjectId: formData.subjectId, week: formData.week })
      });
      const data = await res.json();
      
      if (data.success) {
        setFormData(prev => ({
          ...prev,
          title: data.data.topic,
          schemeOfWork: data.data.objectives
        }));
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Failed to sync with Ministry Scheme.");
    } finally {
      setIsSyncingScheme(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!formData.title) {
      alert("Please enter a Topic / Title first!");
      return;
    }
    setIsGeneratingAI(true);
    
    try {
      const res = await fetch('/api/ai/lesson-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: formData.title })
      });
      const result = await res.json();
      
      if (result.success) {
        setFormData(prev => ({
          ...prev,
          schemeOfWork: prev.schemeOfWork || result.data.schemeOfWork, // Don't overwrite if synced from Ministry
          lessonNote: result.data.lessonNote,
          evaluation: result.data.evaluation,
          assignment: result.data.assignment
        }));
      } else {
        alert("Failed to connect to AI generation service.");
      }
    } catch (error) {
      alert("Network error while generating AI content.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="space-y-6 pb-32 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isReadOnly ? "My Study Notes" : "Lesson Plans & Notes"}
          </h1>
          <p className="text-slate-500">
            {isReadOnly 
              ? "View schemes of work and teacher notes for your class." 
              : "Manage curriculum delivery, scheme of work, and teacher notes."}
          </p>
        </div>
        {!isReadOnly && (
          <button onClick={() => setIsModalOpen(true)} className="bg-[#0033A0] text-white px-4 py-2 rounded-lg hover:bg-[#002277] font-medium text-sm flex items-center gap-2 shadow-sm">
            <Plus className="w-4 h-4" /> Create Lesson Plan
          </button>
        )}
      </div>

      {isReadOnly && userRole === 'STUDENT' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
          <p className="text-sm font-bold text-[#0033A0]">Note: You are viewing study notes for your assigned class.</p>
        </div>
      )}

      {(!isReadOnly || userRole === 'PARENT') && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <label className="text-sm font-bold text-slate-700 whitespace-nowrap">Viewing Notes For:</label>
          <select 
            value={selectedClass} 
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full sm:w-64 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
          >
            <option value="">All Classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" /></div>
      ) : plans.filter((p: any) => selectedClass ? p.classId === selectedClass : true).length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            {isReadOnly ? "No Study Notes Available" : "No Lesson Plans Created"}
          </h3>
          <p className="text-slate-500 text-sm mb-4">
            {isReadOnly 
              ? "Your teachers haven't uploaded any study notes for your class yet." 
              : "Teachers haven't submitted any scheme of work or lesson notes yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.filter((p: any) => selectedClass ? p.classId === selectedClass : true).map(plan => (
            <div key={plan.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div 
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedId(expandedId === plan.id ? null : plan.id)}
              >
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 text-[#0033A0] flex flex-col items-center justify-center shrink-0 border border-blue-100">
                    <span className="text-[10px] uppercase font-bold text-blue-400">Week</span>
                    <span className="text-xl font-black leading-none">{plan.week}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{plan.title}</h3>
                    <p className="text-sm font-bold text-[#0033A0]">{plan.subject?.name} • <span className="text-slate-500 font-medium">{plan.class?.name}</span></p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-slate-700">{plan.teacher?.firstName} {plan.teacher?.lastName}</p>
                    <p className="text-xs text-slate-500">Teacher</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                    {plan.status}
                  </span>
                  <button className="p-2 text-slate-400">{expandedId === plan.id ? <ChevronUp /> : <ChevronDown />}</button>
                </div>
              </div>

              {expandedId === plan.id && (
                <div className="p-6 border-t border-slate-200 bg-slate-50/50 space-y-6 animation-fade-in">
                  
                  {!isReadOnly && (
                    <div className="flex justify-end gap-2 mb-2">
                      <button className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5"><Edit2 className="w-3.5 h-3.5"/> Edit</button>
                      <button onClick={() => handleDeletePlan(plan.id)} className="px-3 py-1.5 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5"/> Delete</button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><FileText className="w-4 h-4 text-[#0033A0]"/> Scheme of Work / Topic</h4>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed shadow-sm min-h-[100px]">
                        {plan.schemeOfWork || 'No scheme provided.'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-[#0033A0]"/> Lesson Note</h4>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed shadow-sm min-h-[100px]">
                        {plan.lessonNote || 'No lesson note provided.'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-600"/> Evaluation</h4>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed shadow-sm min-h-[100px]">
                        {plan.evaluation || 'No evaluation criteria provided.'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-amber-500"/> Assignment</h4>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed shadow-sm min-h-[100px]">
                        {plan.assignment || 'No assignment provided.'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#0A192F]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col animation-fade-in overflow-hidden relative">
            
            {/* AI Generation Overlay */}
            {isGeneratingAI && (
              <div className="absolute inset-0 z-50 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center">
                <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-indigo-200/50">
                  <Wand2 className="w-12 h-12 text-indigo-600 animate-pulse" />
                </div>
                <h3 className="text-2xl font-black text-indigo-900 mb-2">EduManage AI is typing...</h3>
                <p className="text-indigo-700 font-medium">Generating comprehensive lesson notes, evaluations, and assignments.</p>
              </div>
            )}

            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create Lesson Plan</h3>
                <p className="text-xs text-slate-500 mt-1">Submit scheme of work, notes, and assignments.</p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-700 border shadow-sm">X</button>
            </div>
            
            <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
              <form id="lessonForm" onSubmit={handleCreatePlan} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Class</label>
                    <select required value={formData.classId} onChange={e => setFormData({...formData, classId: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none">
                      <option value="">Select Class...</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Subject</label>
                    <select required value={formData.subjectId} onChange={e => setFormData({...formData, subjectId: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none">
                      <option value="">Select Subject...</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Teacher</label>
                    <select required value={formData.teacherId} onChange={e => setFormData({...formData, teacherId: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none">
                      <option value="">Select Teacher...</option>
                      {staff.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Week</label>
                    <input type="number" min="1" max="52" required value={formData.week} onChange={e => setFormData({...formData, week: parseInt(e.target.value)})} className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 outline-none focus:border-[#0033A0] text-center" />
                  </div>
                  <div className="md:col-span-3">
                    <div className="flex justify-between items-end mb-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Topic / Title</label>
                      
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={handleSyncMinistryScheme}
                          disabled={isSyncingScheme || !formData.classId || !formData.subjectId}
                          className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-200"
                          title="Fetches standard topic from Ministry Scheme module"
                        >
                          {isSyncingScheme ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Library className="w-3.5 h-3.5" />}
                          Load Ministry Scheme
                        </button>
                        <button 
                          type="button" 
                          onClick={handleGenerateAI}
                          disabled={isGeneratingAI || !formData.title}
                          className="flex items-center gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Auto-Generate Notes
                        </button>
                      </div>
                    </div>
                    <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all" placeholder="e.g. Introduction to Algebra" />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-[#0033A0] uppercase tracking-wider mb-1 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Scheme of Work</label>
                    <textarea required value={formData.schemeOfWork} onChange={e => setFormData({...formData, schemeOfWork: e.target.value})} className="w-full h-32 px-4 py-3 bg-indigo-50/30 border border-indigo-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed" placeholder="Enter objectives and curriculum outline..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#0033A0] uppercase tracking-wider mb-1 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Comprehensive Lesson Note</label>
                    <textarea required value={formData.lessonNote} onChange={e => setFormData({...formData, lessonNote: e.target.value})} className="w-full h-32 px-4 py-3 bg-indigo-50/30 border border-indigo-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed" placeholder="Detailed notes for students to copy..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Evaluation</label>
                    <textarea value={formData.evaluation} onChange={e => setFormData({...formData, evaluation: e.target.value})} className="w-full h-24 px-4 py-3 bg-emerald-50/30 border border-emerald-200 rounded-xl text-sm outline-none focus:ring-1 focus:ring-emerald-500 resize-none leading-relaxed" placeholder="How will you assess student understanding?" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-amber-600 uppercase tracking-wider mb-1 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Take-Home Assignment</label>
                    <textarea value={formData.assignment} onChange={e => setFormData({...formData, assignment: e.target.value})} className="w-full h-24 px-4 py-3 bg-amber-50/30 border border-amber-200 rounded-xl text-sm outline-none focus:ring-1 focus:ring-amber-500 resize-none leading-relaxed" placeholder="Homework or reading assignments..." />
                  </div>
                </div>

              </form>
            </div>
            
            <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-sm transition-colors shadow-sm">Cancel</button>
              <button form="lessonForm" type="submit" disabled={isSubmitting || isGeneratingAI} className="px-8 py-2.5 bg-[#0033A0] hover:bg-[#002277] text-white rounded-lg font-bold text-sm transition-colors flex justify-center items-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Submit Official Lesson Plan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
