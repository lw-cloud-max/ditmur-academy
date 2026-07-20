"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Plus, ArrowLeft, Loader2, Save, Trash2, CheckCircle2, Type, Upload, FileText, Trophy, Edit2, X, Sparkles, Wand2, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

const EXAM_SECTIONS = ['English Studies', 'Mathematics', 'Quantitative Reasoning', 'Verbal Reasoning', 'General Science'];

export default function ManageExamQuestions() {
  const params = useParams();
  const examId = params.id as string;

  const [activeTab, setActiveTab] = useState('questions');
  const [activeSection, setActiveSection] = useState(EXAM_SECTIONS[0]);
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newQ, setNewQ] = useState({ text: '', imageUrl: '', optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: 'A', marks: 1 });
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [bulkCsv, setBulkCsv] = useState('');
  const [uploadingBulk, setUploadingBulk] = useState(false);

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiNumQuestions, setAiNumQuestions] = useState(5);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQ, setEditQ] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const mathSymbols = ['÷', '×', '±', '−', '√', '∛', '≈', '≠', '≡', '≤', '≥', '∞', 'π', 'θ', '∑', '∫', '°', '²', '³', '½', '¼', '¾', '°C'];

  const fetchData = async () => {
    try {
      const [qRes, rRes] = await Promise.all([
        fetch(`/api/exams/questions?examId=${examId}`),
        fetch(`/api/cbt/results?examId=${examId}`)
      ]);
      const qData = await qRes.json();
      const rData = await rRes.json();
      
      if (qData.success) setQuestions(qData.data);
      if (rData.success) setResults(rData.data);
    } catch (err) {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [examId]);

  const insertSymbol = (symbol: string, isEditing: boolean) => {
    if (isEditing) setEditQ({ ...editQ, text: editQ.text + symbol });
    else setNewQ({ ...newQ, text: newQ.text + symbol });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEditing: boolean) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.size > 2 * 1024 * 1024) { alert("Image must be under 2MB"); return; }

    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        if (isEditing) setEditQ({ ...editQ, imageUrl: data.url });
        else setNewQ({ ...newQ, imageUrl: data.url });
      } else alert(data.error);
    } catch (err) { alert("Upload failed"); } finally { setIsUploadingImage(false); }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch('/api/exams/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newQ, examId, section: activeSection }) });
      const data = await res.json();
      if (data.success) {
        setNewQ({ text: '', imageUrl: '', optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: 'A', marks: 1 });
        setIsAdding(false); fetchData();
      } else alert(data.error);
    } catch (err) {} finally { setSaving(false); }
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingEdit(true);
    try {
      const res = await fetch('/api/exams/questions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editQ) });
      const data = await res.json();
      if (data.success) { setEditingId(null); fetchData(); } else alert(data.error);
    } catch (err) {} finally { setSavingEdit(false); }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("Remove this question?")) return;
    try { await fetch(`/api/exams/questions?id=${id}`, { method: 'DELETE' }); setQuestions(questions.filter(q => q.id !== id)); } catch (err) {}
  };

  const handleBulkUpload = async () => {
    if (!bulkCsv.trim()) return;
    setUploadingBulk(true);
    try {
      const lines = bulkCsv.split('\n');
      const parsedQuestions = [];
      for (const line of lines) {
        if (!line.trim()) continue;
        const [text, optionA, optionB, optionC, optionD, correctAnswer, marks] = line.split('|').map(s => s.trim());
        if (text && optionA && optionB && optionC && optionD && correctAnswer) {
          parsedQuestions.push({ text, optionA, optionB, optionC, optionD, correctAnswer: correctAnswer.toUpperCase(), marks: marks || 1 });
        }
      }
      if (parsedQuestions.length === 0) { alert("No valid questions found."); setUploadingBulk(false); return; }

      const res = await fetch('/api/exams/questions/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ examId, questions: parsedQuestions, section: activeSection }) });
      const data = await res.json();
      if (data.success) { alert(`Imported ${parsedQuestions.length} questions into ${activeSection}!`); setBulkCsv(''); setIsUploading(false); fetchData(); }
      else alert(data.error || "Failed");
    } catch (error) {} finally { setUploadingBulk(false); }
  };

  const handleAIGenerate = async () => {
    if (!aiTopic) return alert("Please enter a topic.");
    setIsGeneratingAI(true);
    try {
      const res = await fetch('/api/ai/cbt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic, numQuestions: aiNumQuestions })
      });
      const data = await res.json();
      if (data.success) {
        const saveRes = await fetch('/api/exams/questions/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ examId, section: activeSection, questions: data.data })
        });
        if (saveRes.ok) {
          alert(`AI successfully generated and saved ${aiNumQuestions} questions into ${activeSection}!`);
          setAiTopic('');
          setIsGeneratingAI(false);
          fetchData();
        }
      }
    } catch (err) { alert("Failed to generate AI questions"); setIsGeneratingAI(false); }
  };

  const safeQuestions = questions.map(q => ({ ...q, section: q.section || 'English Studies' }));
  const filteredQuestions = safeQuestions.filter(q => q.section === activeSection);

  return (
    <div className="space-y-6 pb-32 max-w-5xl mx-auto relative">
      
      {isGeneratingAI && (
        <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl">
          <Wand2 className="w-16 h-16 text-[#0033A0] animate-pulse mb-4" />
          <h3 className="text-2xl font-black text-[#0033A0] mb-2">EduManage AI is working...</h3>
          <p className="text-blue-700 font-medium">Generating multiple-choice questions for {aiTopic}.</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link href="/entrance-exam" className="text-sm font-bold text-[#0033A0] hover:text-[#002277] flex items-center gap-1 mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to Exams
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Manage CBT Exam</h1>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        <button onClick={() => setActiveTab('questions')} className={`pb-4 px-2 text-sm font-bold transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'questions' ? 'border-[#0033A0] text-[#0033A0]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          <FileText className="w-4 h-4" /> Exam Questions
        </button>
        <button onClick={() => setActiveTab('results')} className={`pb-4 px-2 text-sm font-bold transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'results' ? 'border-[#0033A0] text-[#0033A0]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          <Trophy className="w-4 h-4" /> Student Results
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" /></div>
      ) : activeTab === 'questions' ? (
        <div className="space-y-6">
          
          <div className="bg-slate-100 p-1.5 rounded-xl flex flex-wrap gap-1">
            {EXAM_SECTIONS.map(section => (
              <button 
                key={section}
                onClick={() => setActiveSection(section)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeSection === section 
                    ? 'bg-white text-[#0033A0] shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {section}
              </button>
            ))}
          </div>

          <div className="flex gap-3 justify-between items-center bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
            <div>
              <h2 className="font-bold text-slate-800">{activeSection}</h2>
              <p className="text-xs text-slate-500">{filteredQuestions.length} Questions configured in this section</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setIsUploading(true); setIsAdding(false); }} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg hover:bg-emerald-100 transition-colors font-bold text-sm border border-emerald-200">
                <Upload className="w-4 h-4" /> Bulk Upload (CSV)
              </button>
              <button onClick={() => { setIsAdding(true); setIsUploading(false); }} className="flex items-center gap-2 bg-[#0033A0] text-white px-4 py-2 rounded-lg hover:bg-[#002277] font-medium text-sm">
                <Plus className="w-4 h-4" /> Add Question
              </button>
            </div>
          </div>

          {/* AI GENERATOR BLOCK */}
          <div className="bg-indigo-50/50 rounded-xl border border-indigo-200 p-6 flex flex-col md:flex-row gap-4 items-end shadow-sm animation-fade-in">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> Generate Questions with AI</label>
              <input type="text" value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder="Topic (e.g. Current Affairs)" className="w-full px-4 py-2.5 bg-white border border-indigo-200 rounded-lg text-sm outline-none focus:border-indigo-500" />
            </div>
            <div className="w-32 shrink-0">
              <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2">Quantity</label>
              <input type="number" min="1" max="50" value={aiNumQuestions} onChange={e => setAiNumQuestions(parseInt(e.target.value) || 1)} className="w-full px-4 py-2.5 bg-white border border-indigo-200 rounded-lg text-sm outline-none" />
            </div>
            <button onClick={handleAIGenerate} disabled={isGeneratingAI || !aiTopic} className="bg-[#0033A0] text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#002277] disabled:bg-blue-300 flex items-center gap-2">
              {isGeneratingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate
            </button>
          </div>

          {/* BULK UPLOAD */}
          {isUploading && (
            <div className="bg-emerald-50/50 rounded-xl border border-emerald-200 p-6 relative animation-fade-in">
              <h3 className="font-bold text-emerald-900 mb-2">Bulk Import into {activeSection}</h3>
              <p className="text-xs font-mono bg-white p-2 rounded block mt-2 border border-emerald-100 mb-4">Question Text | Option A | Option B | Option C | Option D | CorrectAnswerLetter | Marks</p>
              <textarea value={bulkCsv} onChange={(e) => setBulkCsv(e.target.value)} className="w-full h-48 px-4 py-3 bg-white border border-emerald-200 rounded-lg text-sm font-mono outline-none" placeholder="What is 2 + 2? | 3 | 4 | 5 | 6 | B | 1.0" />
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setIsUploading(false)} className="px-5 py-2 text-slate-600 bg-slate-100 rounded-lg text-sm font-bold transition-colors">Cancel</button>
                <button onClick={handleBulkUpload} disabled={uploadingBulk || !bulkCsv.trim()} className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2 disabled:bg-emerald-300">
                  {uploadingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Import into {activeSection}
                </button>
              </div>
            </div>
          )}

          {/* ADD SINGLE QUESTION FORM */}
          {isAdding && (
            <div className="bg-blue-50/50 rounded-xl border border-blue-200 p-6 relative animation-fade-in">
              <h3 className="font-bold text-[#0033A0] mb-4">New Question in {activeSection}</h3>
              <form onSubmit={handleSaveQuestion} className="space-y-4">
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <label className="block text-sm font-bold text-slate-700">Question Text</label>
                  </div>
                  <textarea required value={newQ.text} onChange={e => setNewQ({...newQ, text: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-base outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] resize-none h-24" placeholder="Enter question..." />
                  
                  {/* MATH SYMBOLS & IMAGE UPLOAD */}
                  <div className="mt-2 bg-white border border-slate-200 p-2 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex flex-wrap gap-1 items-center">
                      <div className="flex items-center text-xs font-bold text-slate-400 px-2"><Type className="w-3 h-3 mr-1" /> Symbol:</div>
                      {mathSymbols.map(sym => <button key={sym} type="button" onClick={() => insertSymbol(sym, false)} className="w-8 h-8 bg-slate-50 hover:bg-blue-100 rounded text-sm font-medium border border-slate-200">{sym}</button>)}
                    </div>
                    <div className="flex items-center">
                      <label className="cursor-pointer flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                        {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                        {isUploadingImage ? 'Uploading...' : 'Attach Image'}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, false)} disabled={isUploadingImage} />
                      </label>
                    </div>
                  </div>

                  {newQ.imageUrl && (
                    <div className="mt-3 relative inline-block">
                      <img src={newQ.imageUrl} alt="Attached diagram" className="h-32 object-contain rounded-lg border border-slate-200 bg-white p-1" />
                      <button type="button" onClick={() => setNewQ({...newQ, imageUrl: ''})} className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 border border-white shadow-sm hover:bg-red-200">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><input type="text" required value={newQ.optionA} onChange={e => setNewQ({...newQ, optionA: e.target.value})} placeholder="Option A" className="w-full px-3 py-2 border rounded-md text-sm outline-none" /></div>
                  <div><input type="text" required value={newQ.optionB} onChange={e => setNewQ({...newQ, optionB: e.target.value})} placeholder="Option B" className="w-full px-3 py-2 border rounded-md text-sm outline-none" /></div>
                  <div><input type="text" required value={newQ.optionC} onChange={e => setNewQ({...newQ, optionC: e.target.value})} placeholder="Option C" className="w-full px-3 py-2 border rounded-md text-sm outline-none" /></div>
                  <div><input type="text" required value={newQ.optionD} onChange={e => setNewQ({...newQ, optionD: e.target.value})} placeholder="Option D" className="w-full px-3 py-2 border rounded-md text-sm outline-none" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-blue-100">
                  <div>
                    <select value={newQ.correctAnswer} onChange={e => setNewQ({...newQ, correctAnswer: e.target.value})} className="w-full px-3 py-2 bg-white border rounded-md text-sm font-bold text-emerald-700 outline-none">
                      <option value="A">Answer: A</option><option value="B">Answer: B</option><option value="C">Answer: C</option><option value="D">Answer: D</option>
                    </select>
                  </div>
                  <div><input type="number" step="0.5" required value={newQ.marks} onChange={e => setNewQ({...newQ, marks: parseFloat(e.target.value)})} placeholder="Marks" className="w-full px-3 py-2 border rounded-md text-sm outline-none" /></div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsAdding(false)} className="px-5 py-2 text-slate-600 bg-slate-100 rounded-lg text-sm font-bold">Cancel</button>
                  <button type="submit" disabled={saving || isUploadingImage} className="px-5 py-2 bg-[#0033A0] text-white rounded-lg text-sm font-bold flex items-center gap-2 disabled:bg-blue-300">{saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Question</button>
                </div>
              </form>
            </div>
          )}

          {/* EDIT MODAL */}
          {editingId && editQ && (
            <div className="fixed inset-0 z-50 bg-[#0A192F]/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b flex justify-between items-center bg-amber-50">
                  <h3 className="font-bold text-amber-900 flex items-center gap-2"><Edit2 className="w-5 h-5" /> Edit Question</h3>
                  <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-slate-800"><X className="w-5 h-5"/></button>
                </div>
                <form onSubmit={handleUpdateQuestion} className="p-6 space-y-4">
                  <div>
                    <textarea required value={editQ.text} onChange={e => setEditQ({...editQ, text: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-lg text-base h-24 outline-none focus:border-amber-400" />
                    <div className="mt-2 bg-slate-50 border border-slate-200 p-2 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex flex-wrap gap-1">
                        {mathSymbols.map(sym => <button key={sym} type="button" onClick={() => insertSymbol(sym, true)} className="w-8 h-8 bg-white border rounded text-sm font-medium hover:bg-amber-100">{sym}</button>)}
                      </div>
                      <div className="flex items-center">
                        <label className="cursor-pointer flex items-center gap-2 bg-white border hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                          {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                          {isUploadingImage ? 'Uploading...' : 'Replace Image'}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, true)} disabled={isUploadingImage} />
                        </label>
                      </div>
                    </div>
                    {editQ.imageUrl && (
                      <div className="mt-3 relative inline-block">
                        <img src={editQ.imageUrl} alt="Attached diagram" className="h-32 object-contain rounded-lg border border-slate-200 bg-white p-1" />
                        <button type="button" onClick={() => setEditQ({...editQ, imageUrl: ''})} className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 border border-white shadow-sm hover:bg-red-200">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><input type="text" required value={editQ.optionA} onChange={e => setEditQ({...editQ, optionA: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:border-amber-400" /></div>
                    <div><input type="text" required value={editQ.optionB} onChange={e => setEditQ({...editQ, optionB: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:border-amber-400" /></div>
                    <div><input type="text" required value={editQ.optionC} onChange={e => setEditQ({...editQ, optionC: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:border-amber-400" /></div>
                    <div><input type="text" required value={editQ.optionD} onChange={e => setEditQ({...editQ, optionD: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:border-amber-400" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div><select value={editQ.correctAnswer} onChange={e => setEditQ({...editQ, correctAnswer: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm font-bold text-emerald-700 outline-none"><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select></div>
                    <div><input type="number" step="0.5" required value={editQ.marks} onChange={e => setEditQ({...editQ, marks: parseFloat(e.target.value)})} className="w-full px-3 py-2 border rounded-md text-sm outline-none" /></div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setEditingId(null)} className="px-5 py-2 bg-slate-100 rounded-lg text-sm font-bold">Cancel</button>
                    <button type="submit" disabled={savingEdit || isUploadingImage} className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 disabled:bg-amber-300">{savingEdit && <Loader2 className="w-4 h-4 animate-spin"/>} Update</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* LIST */}
          {filteredQuestions.length === 0 && !isAdding && !isUploading ? (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-12 text-center text-slate-500">No questions configured in this section yet.</div>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map((q, index) => (
                <div key={q.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative group">
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button onClick={() => { setEditQ(q); setEditingId(q.id); }} className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors border border-amber-100"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteQuestion(q.id)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-red-100"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="flex items-start gap-3 mb-4 pr-24">
                    <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-sm border shrink-0">{index + 1}</span>
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg whitespace-pre-wrap leading-tight">{q.text}</h4>
                      {q.imageUrl && <img src={q.imageUrl} alt="Question diagram" className="h-32 object-contain mt-3 rounded-lg border border-slate-200 bg-slate-50 p-1" />}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-11">
                    {['A', 'B', 'C', 'D'].map((letter) => {
                      const isCorrect = q.correctAnswer === letter;
                      return (
                        <div key={letter} className={`p-3 rounded-lg border text-sm flex items-start gap-3 ${isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-medium' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                          <span className={`font-bold ${isCorrect ? 'text-emerald-600' : 'text-slate-400'}`}>{letter}.</span><span>{q[`option${letter}`]}</span>{isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {results.length === 0 ? (
            <div className="p-16 text-center text-slate-500"><Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" /><h3 className="text-lg font-bold text-slate-900 mb-1">No Results Yet</h3></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Rank</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Candidate ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {results.map((res, index) => (
                    <tr key={res.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-bold text-slate-900">{index + 1}</td>
                      <td className="px-6 py-4 font-mono font-bold text-[#0033A0]">{res.studentId}</td>
                      <td className="px-6 py-4 text-center"><p className="font-bold text-lg">{res.score} / {res.totalMarks}</p></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
