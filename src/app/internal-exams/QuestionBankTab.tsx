"use client";

import { useState, useEffect } from 'react';
import { Search, Plus, Upload, Loader2, Trash2, CheckCircle2, Type, Database, BookOpen, Edit2, X, Save, Sparkles, Wand2 } from 'lucide-react';

export default function QuestionBankTab({ classes, subjects }: { classes: any[], subjects: any[] }) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newQ, setNewQ] = useState({ text: '', optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: 'A', marks: 1 });

  const [isUploading, setIsUploading] = useState(false);
  const [bulkCsv, setBulkCsv] = useState('');
  const [uploadingBulk, setUploadingBulk] = useState(false);

  // AI GENERATOR STATE
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiNumQuestions, setAiNumQuestions] = useState(5);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQ, setEditQ] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const mathSymbols = ['÷', '×', '±', '−', '√', '∛', '≈', '≠', '≡', '≤', '≥', '∞', 'π', 'θ', '∑', '∫', '°', '²', '³', '½', '¼', '¾', '°C'];

  const fetchQuestions = async () => {
    if (!selectedSubject) return;
    setLoading(true);
    try {
      let url = `/api/question-bank?subjectId=${selectedSubject}`;
      if (selectedClass) url += `&classId=${selectedClass}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setQuestions(data.data);
    } catch (err) {} finally { setLoading(false); }
  };

  useEffect(() => { fetchQuestions(); }, [selectedSubject, selectedClass]);

  const insertSymbol = (symbol: string, isEditing: boolean) => {
    if (isEditing) setEditQ({ ...editQ, text: editQ.text + symbol });
    else setNewQ({ ...newQ, text: newQ.text + symbol });
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch('/api/question-bank', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newQ, subjectId: selectedSubject, classId: selectedClass }) });
      const data = await res.json();
      if (data.success) {
        setNewQ({ text: '', optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: 'A', marks: 1 });
        setIsAdding(false); fetchQuestions();
      } else alert(data.error);
    } catch (err) {} finally { setSaving(false); }
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingEdit(true);
    try {
      const res = await fetch('/api/question-bank', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editQ) });
      const data = await res.json();
      if (data.success) { setEditingId(null); fetchQuestions(); } else alert(data.error);
    } catch (err) {} finally { setSavingEdit(false); }
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

      const res = await fetch('/api/question-bank/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subjectId: selectedSubject, classId: selectedClass, questions: parsedQuestions }) });
      const data = await res.json();
      if (data.success) { alert(`Imported ${parsedQuestions.length} questions!`); setBulkCsv(''); setIsUploading(false); fetchQuestions(); }
      else alert(data.error);
    } catch (error) {} finally { setUploadingBulk(false); }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    try { await fetch(`/api/question-bank?id=${id}`, { method: 'DELETE' }); setQuestions(questions.filter(q => q.id !== id)); } catch (err) {}
  };

  // AI GENERATOR
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
        // Automatically save these to the database via bulk upload route
        const saveRes = await fetch('/api/question-bank/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subjectId: selectedSubject, classId: selectedClass, questions: data.data })
        });
        if (saveRes.ok) {
          alert(`AI successfully generated and saved ${aiNumQuestions} questions!`);
          setIsGeneratingAI(false);
          fetchQuestions();
        }
      }
    } catch (err) { alert("Failed to generate AI questions"); setIsGeneratingAI(false); }
  };

  return (
    <div className="space-y-6 animation-fade-in relative">
      
      {isGeneratingAI && (
        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl min-h-[500px]">
          <Wand2 className="w-16 h-16 text-indigo-600 animate-pulse mb-4" />
          <h3 className="text-2xl font-black text-indigo-900 mb-2">EduManage AI is working...</h3>
          <p className="text-indigo-700 font-medium">Generating multiple-choice questions for {aiTopic}.</p>
        </div>
      )}

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">1. Select Subject</label>
          <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-[#0033A0] outline-none">
            <option value="">-- Choose Subject --</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">2. Filter by Class Level (Optional)</label>
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 outline-none">
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {!selectedSubject ? (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-16 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-1">Select a subject</h3>
          <p className="text-slate-500 text-sm">Choose a subject above to view or add questions to the global bank.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex gap-3 justify-between items-center bg-white p-4 border border-slate-200 rounded-xl shadow-sm flex-wrap">
            <div>
              <h2 className="font-bold text-slate-800 flex items-center gap-2"><Database className="w-4 h-4 text-[#0033A0]"/> Question Repository</h2>
              <p className="text-xs text-slate-500">{questions.length} questions available</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => { setIsUploading(true); setIsAdding(false); }} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg hover:bg-emerald-100 font-bold text-sm border border-emerald-200"><Upload className="w-4 h-4" /> Bulk Upload</button>
              <button onClick={() => { setIsAdding(true); setIsUploading(false); }} className="flex items-center gap-2 bg-[#0033A0] text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-[#002277]"><Plus className="w-4 h-4" /> Add Question</button>
            </div>
          </div>

          {/* AI GENERATOR BLOCK */}
          <div className="bg-indigo-50/50 rounded-xl border border-indigo-200 p-6 flex flex-col md:flex-row gap-4 items-end shadow-sm">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> Generate Questions with AI</label>
              <input type="text" value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder="Topic (e.g. Algebra)" className="w-full px-4 py-2.5 bg-white border border-indigo-200 rounded-lg text-sm outline-none focus:border-indigo-500" />
            </div>
            <div className="w-32 shrink-0">
              <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2">Quantity</label>
              <input type="number" min="1" max="50" value={aiNumQuestions} onChange={e => setAiNumQuestions(parseInt(e.target.value) || 1)} className="w-full px-4 py-2.5 bg-white border border-indigo-200 rounded-lg text-sm outline-none" />
            </div>
            <button onClick={handleAIGenerate} disabled={isGeneratingAI || !aiTopic} className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:bg-indigo-300">
              Generate
            </button>
          </div>

          {/* BULK UPLOAD */}
          {isUploading && (
            <div className="bg-emerald-50/50 rounded-xl border border-emerald-200 p-6 relative">
              <h3 className="font-bold text-emerald-900 mb-2">Bulk Import to Bank</h3>
              <textarea value={bulkCsv} onChange={(e) => setBulkCsv(e.target.value)} className="w-full h-48 px-4 py-3 bg-white border border-emerald-200 rounded-lg text-sm font-mono outline-none" placeholder="What is 2 + 2? | 3 | 4 | 5 | 6 | B | 1.0" />
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setIsUploading(false)} className="px-5 py-2 text-slate-600 bg-slate-100 rounded-lg font-bold text-sm">Cancel</button>
                <button onClick={handleBulkUpload} disabled={uploadingBulk || !bulkCsv.trim()} className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm flex items-center gap-2">{uploadingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import'}</button>
              </div>
            </div>
          )}

          {/* ADD QUESTION */}
          {isAdding && (
            <div className="bg-blue-50/50 rounded-xl border border-blue-200 p-6 relative">
              <h3 className="font-bold text-[#0033A0] mb-4">New Question</h3>
              <form onSubmit={handleSaveQuestion} className="space-y-4">
                <div>
                  <textarea required value={newQ.text} onChange={e => setNewQ({...newQ, text: e.target.value})} className="w-full px-4 py-3 bg-white border rounded-lg h-24 outline-none focus:border-[#0033A0]" placeholder="Enter question..." />
                  <div className="mt-2 bg-white border p-2 rounded-lg flex flex-wrap gap-1">
                    <div className="flex items-center text-xs font-bold text-slate-400 px-2"><Type className="w-3 h-3 mr-1" /> Symbol:</div>
                    {mathSymbols.map(sym => <button key={sym} type="button" onClick={() => insertSymbol(sym, false)} className="w-8 h-8 bg-slate-50 rounded text-sm font-medium border border-slate-200">{sym}</button>)}
                  </div>
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
                  <button type="submit" disabled={saving} className="px-5 py-2 bg-[#0033A0] text-white rounded-lg text-sm font-bold flex items-center gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Question</button>
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
                  <div><textarea required value={editQ.text} onChange={e => setEditQ({...editQ, text: e.target.value})} className="w-full px-4 py-3 border rounded-lg h-24" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><input type="text" required value={editQ.optionA} onChange={e => setEditQ({...editQ, optionA: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm" /></div>
                    <div><input type="text" required value={editQ.optionB} onChange={e => setEditQ({...editQ, optionB: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm" /></div>
                    <div><input type="text" required value={editQ.optionC} onChange={e => setEditQ({...editQ, optionC: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm" /></div>
                    <div><input type="text" required value={editQ.optionD} onChange={e => setEditQ({...editQ, optionD: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div><select value={editQ.correctAnswer} onChange={e => setEditQ({...editQ, correctAnswer: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm font-bold text-emerald-700"><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select></div>
                    <div><input type="number" step="0.5" required value={editQ.marks} onChange={e => setEditQ({...editQ, marks: parseFloat(e.target.value)})} className="w-full px-3 py-2 border rounded-md text-sm" /></div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setEditingId(null)} className="px-5 py-2 bg-slate-100 rounded-lg text-sm font-bold">Cancel</button>
                    <button type="submit" disabled={savingEdit} className="px-5 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold flex items-center gap-2">{savingEdit && <Loader2 className="w-4 h-4 animate-spin"/>} Update</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {loading ? (
             <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" /></div>
          ) : questions.length === 0 && !isAdding && !isUploading ? (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-12 text-center text-slate-500">No questions in bank.</div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, index) => (
                <div key={q.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative group">
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button onClick={() => { setEditQ(q); setEditingId(q.id); }} className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors border border-amber-100"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteQuestion(q.id)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-red-100"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="flex items-center gap-3 mb-4 pr-24">
                    <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-sm border shrink-0">{index + 1}</span>
                    <h4 className="font-bold text-slate-900 text-lg whitespace-pre-wrap">{q.text}</h4>
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
      )}
    </div>
  );
}
