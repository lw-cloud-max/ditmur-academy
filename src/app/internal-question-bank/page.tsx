"use client";

import { useState, useEffect } from 'react';
import { 
  Search, Plus, Upload, Loader2, Trash2, CheckCircle2, Type, Database, 
  BookOpen, Edit2, X, Save, Sparkles, Wand2, GraduationCap, Filter
} from 'lucide-react';

interface Question {
  id: string;
  subjectId: string;
  subject: { name: string };
  classId?: string;
  class?: { name: string };
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation?: string;
  topic?: string;
  difficulty: string;
  isActive: boolean;
}

export default function InternalQuestionBankPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('ALL');

  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newQ, setNewQ] = useState({ 
    subjectId: '', classId: '', text: '', optionA: '', optionB: '', optionC: '', optionD: '', 
    correctAnswer: 'A', explanation: '', topic: '', difficulty: 'MEDIUM' 
  });

  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkCsv, setBulkCsv] = useState('');
  const [uploadingBulk, setUploadingBulk] = useState(false);

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiNumQuestions, setAiNumQuestions] = useState(5);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQ, setEditQ] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchQuestions();
    fetchSubjectsAndClasses();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/internal-question-bank');
      const data = await res.json();
      if (data.success) {
        setQuestions(data.data);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjectsAndClasses = async () => {
    try {
      const [sRes, cRes] = await Promise.all([
        fetch('/api/subjects'),
        fetch('/api/classes')
      ]);
      const sData = await sRes.json();
      const cData = await cRes.json();
      if (sData.success) setSubjects(sData.data);
      if (cData.success) setClasses(cData.data);
    } catch (error) {
      console.error('Error fetching subjects/classes:', error);
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/internal-question-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQ)
      });
      const data = await res.json();
      if (data.success) {
        setNewQ({ subjectId: '', classId: '', text: '', optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: 'A', explanation: '', topic: '', difficulty: 'MEDIUM' });
        setIsAdding(false);
        fetchQuestions();
        alert('Question added successfully!');
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error saving question:', error);
      alert('Failed to save question');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const res = await fetch('/api/internal-question-bank', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editQ)
      });
      const data = await res.json();
      if (data.success) {
        setEditingId(null);
        fetchQuestions();
        alert('Question updated!');
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error updating question:', error);
      alert('Failed to update question');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    try {
      await fetch(`/api/internal-question-bank?id=${id}`, { method: 'DELETE' });
      setQuestions(questions.filter(q => q.id !== id));
    } catch (error) {
      console.error('Error deleting question:', error);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkCsv.trim()) return;
    setUploadingBulk(true);
    try {
      const lines = bulkCsv.split('\n');
      const parsedQuestions = [];
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split('|').map(s => s.trim());
        if (parts.length >= 6) {
          const [text, optionA, optionB, optionC, optionD, correctAnswer, explanation, topic, difficulty] = parts;
          if (text && optionA && optionB && optionC && optionD && correctAnswer) {
            parsedQuestions.push({ 
              subjectId: newQ.subjectId || subjects[0]?.id,
              text, optionA, optionB, optionC, optionD, 
              correctAnswer: correctAnswer.toUpperCase(), 
              explanation: explanation || '',
              topic: topic || '',
              difficulty: difficulty || 'MEDIUM'
            });
          }
        }
      }
      
      if (parsedQuestions.length === 0) {
        alert("No valid questions found. Format: Question | A | B | C | D | Answer | Explanation | Topic | Difficulty");
        setUploadingBulk(false);
        return;
      }

      const res = await fetch('/api/internal-question-bank', { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ questions: parsedQuestions }) 
      });
      const data = await res.json();
      if (data.success) {
        alert(`Imported ${data.count} questions!`);
        setBulkCsv('');
        setIsBulkUploading(false);
        fetchQuestions();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error uploading questions:', error);
      alert('Failed to upload questions');
    } finally {
      setUploadingBulk(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!aiTopic) return alert('Please enter a topic');
    setIsGeneratingAI(true);
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      
      if (!apiKey) {
        // Fallback: Generate sample questions
        const sampleQuestions = [];
        for (let i = 1; i <= aiNumQuestions; i++) {
          sampleQuestions.push({
            text: `Sample question ${i} about ${aiTopic}?`,
            optionA: 'Option A',
            optionB: 'Option B',
            optionC: 'Option C',
            optionD: 'Option D',
            correctAnswer: 'B',
            explanation: `This is a sample explanation for question ${i} about ${aiTopic}.`,
            topic: aiTopic,
            difficulty: i % 3 === 0 ? 'HARD' : i % 3 === 1 ? 'EASY' : 'MEDIUM'
          });
        }

        // Save sample questions
        const saveRes = await fetch('/api/internal-question-bank', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            questions: sampleQuestions.map(q => ({
              subjectId: newQ.subjectId || subjects[0]?.id,
              ...q
            }))
          })
        });
        const saveData = await saveRes.json();
        if (saveData.success) {
          alert(`Generated ${saveData.count} sample questions! (Configure OPENAI_API_KEY for AI-powered questions)`);
          fetchQuestions();
        }
        setIsGeneratingAI(false);
        return;
      }

      // Use AI API
      const res = await fetch('/api/ai/cbt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          topic: aiTopic, 
          numQuestions: aiNumQuestions,
          subject: subjects.find(s => s.id === newQ.subjectId)?.name || 'Mathematics'
        })
      });
      const data = await res.json();
      
      if (data.success && data.data && data.data.length > 0) {
        // Save generated questions
        const saveRes = await fetch('/api/internal-question-bank', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            questions: data.data.map((q: any) => ({
              subjectId: newQ.subjectId || subjects[0]?.id,
              ...q
            }))
          })
        });
        const saveData = await saveRes.json();
        if (saveData.success) {
          alert(`Generated and saved ${saveData.count} questions!`);
          fetchQuestions();
        }
      } else {
        alert(data.error || 'Failed to generate questions');
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      alert('Failed to generate questions');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = 
      q.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.topic?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = !filterSubject || q.subjectId === filterSubject;
    const matchesDifficulty = filterDifficulty === 'ALL' || q.difficulty === filterDifficulty;
    return matchesSearch && matchesSubject && matchesDifficulty;
  });

  return (
    <div className="space-y-6 pb-32 max-w-7xl mx-auto animation-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-7 h-7 text-[#0033A0]" />
            Internal Exam Question Bank
          </h1>
          <p className="text-slate-500 mt-1">Manage questions for internal school exams</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsBulkUploading(true)}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Bulk Upload
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="px-6 py-3 bg-[#0033A0] text-white rounded-xl font-bold hover:bg-[#002277] transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Question
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">Total Questions</p>
          <p className="text-2xl font-black text-slate-900">{questions.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">Easy</p>
          <p className="text-2xl font-black text-emerald-600">{questions.filter(q => q.difficulty === 'EASY').length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">Medium</p>
          <p className="text-2xl font-black text-amber-600">{questions.filter(q => q.difficulty === 'MEDIUM').length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">Hard</p>
          <p className="text-2xl font-black text-red-600">{questions.filter(q => q.difficulty === 'HARD').length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
            />
          </div>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
          >
            <option value="">All Subjects</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
          >
            <option value="ALL">All Difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>
      </div>

      {/* AI Generator */}
      <div className="bg-indigo-50/50 rounded-xl border border-indigo-200 p-6">
        <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Generate Questions with AI
        </h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder="Topic (e.g., Algebra, Photosynthesis)"
              className="w-full px-4 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <div className="w-32">
            <input
              type="number"
              min="1"
              max="20"
              value={aiNumQuestions}
              onChange={(e) => setAiNumQuestions(parseInt(e.target.value) || 5)}
              className="w-full px-4 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm outline-none"
            />
          </div>
          <button
            onClick={handleAIGenerate}
            disabled={isGeneratingAI || !aiTopic}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isGeneratingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            Generate
          </button>
        </div>
      </div>

      {/* Bulk Upload */}
      {isBulkUploading && (
        <div className="bg-emerald-50/50 rounded-xl border border-emerald-200 p-6">
          <h3 className="font-bold text-emerald-900 mb-2">Bulk Upload Questions</h3>
          <p className="text-sm text-emerald-700 mb-4">
            Format: Question | Option A | Option B | Option C | Option D | Correct Answer | Explanation | Topic | Difficulty
          </p>
          <textarea
            value={bulkCsv}
            onChange={(e) => setBulkCsv(e.target.value)}
            rows={8}
            className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl text-sm font-mono outline-none"
            placeholder="What is 2 + 2? | 3 | 4 | 5 | 6 | B | 2 + 2 = 4 | Arithmetic | EASY"
          />
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setIsBulkUploading(false)}
              className="px-5 py-2 text-slate-600 bg-slate-100 rounded-lg font-bold text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkUpload}
              disabled={uploadingBulk || !bulkCsv.trim()}
              className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {uploadingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload
            </button>
          </div>
        </div>
      )}

      {/* Add Question Form */}
      {isAdding && (
        <div className="bg-blue-50/50 rounded-xl border border-blue-200 p-6">
          <h3 className="font-bold text-[#0033A0] mb-4">Add New Question</h3>
          <form onSubmit={handleSaveQuestion} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
                <select
                  required
                  value={newQ.subjectId}
                  onChange={e => setNewQ({...newQ, subjectId: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none"
                >
                  <option value="">Select Subject</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Class (Optional)</label>
                <select
                  value={newQ.classId}
                  onChange={e => setNewQ({...newQ, classId: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none"
                >
                  <option value="">All Classes</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Question *</label>
              <textarea
                required
                value={newQ.text}
                onChange={e => setNewQ({...newQ, text: e.target.value})}
                rows={3}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none resize-none"
                placeholder="Enter question..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Option A *</label>
                <input
                  type="text"
                  required
                  value={newQ.optionA}
                  onChange={e => setNewQ({...newQ, optionA: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Option B *</label>
                <input
                  type="text"
                  required
                  value={newQ.optionB}
                  onChange={e => setNewQ({...newQ, optionB: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Option C *</label>
                <input
                  type="text"
                  required
                  value={newQ.optionC}
                  onChange={e => setNewQ({...newQ, optionC: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Option D *</label>
                <input
                  type="text"
                  required
                  value={newQ.optionD}
                  onChange={e => setNewQ({...newQ, optionD: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Correct Answer *</label>
                <select
                  required
                  value={newQ.correctAnswer}
                  onChange={e => setNewQ({...newQ, correctAnswer: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none"
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Topic</label>
                <input
                  type="text"
                  value={newQ.topic}
                  onChange={e => setNewQ({...newQ, topic: e.target.value})}
                  placeholder="e.g., Algebra"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
                <select
                  value={newQ.difficulty}
                  onChange={e => setNewQ({...newQ, difficulty: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none"
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Explanation (Optional)</label>
              <textarea
                value={newQ.explanation}
                onChange={e => setNewQ({...newQ, explanation: e.target.value})}
                rows={3}
                placeholder="Step-by-step solution..."
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-[#0033A0] text-white rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Question
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Questions List */}
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" />
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-xl border border-slate-200">
          <Database className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-700">No questions found</p>
          <p className="text-sm text-slate-500 mt-1">Add questions to build your question bank</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((q, index) => (
            <div key={q.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                      {q.subject.name}
                    </span>
                    {q.class && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">
                        {q.class.name}
                      </span>
                    )}
                    {q.topic && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                        {q.topic}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      q.difficulty === 'EASY' ? 'bg-green-100 text-green-700' :
                      q.difficulty === 'HARD' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {q.difficulty}
                    </span>
                  </div>
                  <p className="text-slate-900 font-medium">{q.text}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditQ(q); setEditingId(q.id); }}
                    className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(['A', 'B', 'C', 'D'] as const).map(opt => (
                  <div key={opt} className={`p-3 rounded-lg border text-sm ${
                    q.correctAnswer === opt 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-medium' 
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <span className="font-bold">{opt}.</span> {String(q[`option${opt}` as keyof Question] || '')}
                    {q.correctAnswer === opt && <CheckCircle2 className="w-4 h-4 text-emerald-500 inline ml-2" />}
                  </div>
                ))}
              </div>

              {q.explanation && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-bold text-blue-800 mb-1">Explanation:</p>
                  <p className="text-sm text-blue-700">{q.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingId && editQ && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-slate-900">Edit Question</h3>
              <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateQuestion} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Question</label>
                <textarea
                  required
                  value={editQ.text}
                  onChange={e => setEditQ({...editQ, text: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Option A</label>
                  <input
                    type="text"
                    required
                    value={editQ.optionA}
                    onChange={e => setEditQ({...editQ, optionA: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Option B</label>
                  <input
                    type="text"
                    required
                    value={editQ.optionB}
                    onChange={e => setEditQ({...editQ, optionB: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Option C</label>
                  <input
                    type="text"
                    required
                    value={editQ.optionC}
                    onChange={e => setEditQ({...editQ, optionC: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Option D</label>
                  <input
                    type="text"
                    required
                    value={editQ.optionD}
                    onChange={e => setEditQ({...editQ, optionD: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Correct Answer</label>
                  <select
                    value={editQ.correctAnswer}
                    onChange={e => setEditQ({...editQ, correctAnswer: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Topic</label>
                  <input
                    type="text"
                    value={editQ.topic || ''}
                    onChange={e => setEditQ({...editQ, topic: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
                  <select
                    value={editQ.difficulty}
                    onChange={e => setEditQ({...editQ, difficulty: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Explanation</label>
                <textarea
                  value={editQ.explanation || ''}
                  onChange={e => setEditQ({...editQ, explanation: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 bg-[#0033A0] text-white rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Update Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
