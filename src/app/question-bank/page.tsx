"use client";

import { useState, useEffect } from 'react';
import { 
  BookOpen, Plus, Search, Filter, Upload, Download, Trash2, Edit, 
  Loader2, X, CheckCircle2, AlertCircle, FileText, Database
} from 'lucide-react';

interface Question {
  id: string;
  examType: string;
  subject: string;
  year: number | null;
  questionNumber: number;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string | null;
  topic: string | null;
  difficulty: string;
  isActive: boolean;
}

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterExamType, setFilterExamType] = useState('ALL');
  const [filterSubject, setFilterSubject] = useState('ALL');
  const [filters, setFilters] = useState<{ examTypes: string[]; subjects: string[]; years: number[] }>({ 
    examTypes: [], subjects: [], years: [] 
  });

  // Add question modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    examType: 'JAMB',
    subject: '',
    year: '',
    questionNumber: '',
    text: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: 'A',
    explanation: '',
    topic: '',
    difficulty: 'MEDIUM'
  });

  // Upload state
  const [uploadText, setUploadText] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, [filterExamType, filterSubject]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      let url = '/api/question-bank?';
      if (filterExamType !== 'ALL') url += `examType=${filterExamType}&`;
      if (filterSubject !== 'ALL') url += `subject=${filterSubject}&`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setQuestions(data.data);
        setFilters(data.filters);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingQuestion ? '/api/question-bank' : '/api/question-bank';
      const method = editingQuestion ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editingQuestion 
            ? { id: editingQuestion.id, ...formData }
            : formData
        )
      });

      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setEditingQuestion(null);
        resetForm();
        fetchQuestions();
        alert(editingQuestion ? 'Question updated!' : 'Question added!');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error saving question:', error);
      alert('Failed to save question');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!uploadText.trim()) {
      alert('Please paste questions in JSON format');
      return;
    }

    setUploading(true);
    try {
      const questions = JSON.parse(uploadText);
      
      if (!Array.isArray(questions)) {
        alert('Invalid format. Expected an array of questions.');
        return;
      }

      const res = await fetch('/api/question-bank', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions })
      });

      const data = await res.json();
      if (data.success) {
        setShowUploadModal(false);
        setUploadText('');
        fetchQuestions();
        alert(`Successfully imported ${data.count} questions!`);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error uploading questions:', error);
      alert('Invalid JSON format. Please check the format and try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const res = await fetch(`/api/question-bank?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchQuestions();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting question:', error);
    }
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      examType: question.examType,
      subject: question.subject,
      year: question.year?.toString() || '',
      questionNumber: question.questionNumber.toString(),
      text: question.text,
      optionA: question.optionA,
      optionB: question.optionB,
      optionC: question.optionC,
      optionD: question.optionD,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || '',
      topic: question.topic || '',
      difficulty: question.difficulty
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      examType: 'JAMB',
      subject: '',
      year: '',
      questionNumber: '',
      text: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctAnswer: 'A',
      explanation: '',
      topic: '',
      difficulty: 'MEDIUM'
    });
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = 
      q.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.topic?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 pb-32 max-w-7xl mx-auto animation-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-7 h-7 text-[#0033A0]" />
            Question Bank
          </h1>
          <p className="text-slate-500 mt-1">Manage JAMB, WAEC & NECO past questions</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Bulk Upload
          </button>
          <button
            onClick={() => { resetForm(); setEditingQuestion(null); setShowAddModal(true); }}
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
          <p className="text-sm text-slate-500">JAMB Questions</p>
          <p className="text-2xl font-black text-blue-600">{questions.filter(q => q.examType === 'JAMB').length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">WAEC Questions</p>
          <p className="text-2xl font-black text-emerald-600">{questions.filter(q => q.examType === 'WAEC').length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">NECO Questions</p>
          <p className="text-2xl font-black text-purple-600">{questions.filter(q => q.examType === 'NECO').length}</p>
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
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterExamType}
              onChange={(e) => { setFilterExamType(e.target.value); setFilterSubject('ALL'); }}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
            >
              <option value="ALL">All Exam Types</option>
              {filters.examTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
            >
              <option value="ALL">All Subjects</option>
              {filters.subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" />
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="text-center p-12 text-slate-500">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-medium">No questions found</p>
            <p className="text-sm mt-1">Add questions or upload a JSON file</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredQuestions.map((question, index) => (
              <div key={question.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                        {question.examType}
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">
                        {question.subject}
                      </span>
                      {question.year && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                          {question.year}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        question.difficulty === 'EASY' ? 'bg-green-100 text-green-700' :
                        question.difficulty === 'HARD' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {question.difficulty}
                      </span>
                      {question.topic && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                          {question.topic}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-900 mb-2">
                      Q{question.questionNumber}. {question.text}
                    </p>
                    <div className="grid grid-cols-2 gap-1 text-xs text-slate-600">
                      <span>A. {question.optionA}</span>
                      <span>B. {question.optionB}</span>
                      <span>C. {question.optionC}</span>
                      <span>D. {question.optionD}</span>
                    </div>
                    <p className="text-xs text-emerald-600 font-bold mt-2">
                      Correct Answer: {question.correctAnswer}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditQuestion(question)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(question.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animation-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingQuestion ? 'Edit Question' : 'Add New Question'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">Add to JAMB, WAEC & NECO question bank</p>
              </div>
              <button onClick={() => { setShowAddModal(false); setEditingQuestion(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddQuestion} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Exam Type *</label>
                  <select
                    required
                    value={formData.examType}
                    onChange={(e) => setFormData({...formData, examType: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                  >
                    <option value="JAMB">JAMB</option>
                    <option value="WAEC">WAEC</option>
                    <option value="NECO">NECO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    placeholder="e.g., Mathematics"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({...formData, year: e.target.value})}
                    placeholder="e.g., 2024"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Question Number *</label>
                  <input
                    type="number"
                    required
                    value={formData.questionNumber}
                    onChange={(e) => setFormData({...formData, questionNumber: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Question Text *</label>
                <textarea
                  required
                  value={formData.text}
                  onChange={(e) => setFormData({...formData, text: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Option A *</label>
                  <input
                    type="text"
                    required
                    value={formData.optionA}
                    onChange={(e) => setFormData({...formData, optionA: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Option B *</label>
                  <input
                    type="text"
                    required
                    value={formData.optionB}
                    onChange={(e) => setFormData({...formData, optionB: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Option C *</label>
                  <input
                    type="text"
                    required
                    value={formData.optionC}
                    onChange={(e) => setFormData({...formData, optionC: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Option D *</label>
                  <input
                    type="text"
                    required
                    value={formData.optionD}
                    onChange={(e) => setFormData({...formData, optionD: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Correct Answer *</label>
                  <select
                    required
                    value={formData.correctAnswer}
                    onChange={(e) => setFormData({...formData, correctAnswer: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
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
                    value={formData.topic}
                    onChange={(e) => setFormData({...formData, topic: e.target.value})}
                    placeholder="e.g., Algebra"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Explanation</label>
                <textarea
                  value={formData.explanation}
                  onChange={(e) => setFormData({...formData, explanation: e.target.value})}
                  rows={3}
                  placeholder="Step-by-step solution..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0] resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingQuestion(null); }}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-[#0033A0] text-white rounded-xl font-bold hover:bg-[#002277] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  {editingQuestion ? 'Update Question' : 'Add Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animation-fade-in">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Bulk Upload Questions</h3>
                <p className="text-xs text-slate-500 mt-1">Upload multiple questions at once using JSON format</p>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm font-bold text-blue-800 mb-2">JSON Format:</p>
                <pre className="text-xs text-blue-700 bg-blue-100 p-2 rounded overflow-x-auto">
{`[
  {
    "examType": "JAMB",
    "subject": "Mathematics",
    "year": 2024,
    "questionNumber": 1,
    "text": "Question text here",
    "optionA": "Option A",
    "optionB": "Option B",
    "optionC": "Option C",
    "optionD": "Option D",
    "correctAnswer": "B",
    "explanation": "Solution here",
    "topic": "Algebra",
    "difficulty": "EASY"
  }
]`}
                </pre>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Paste JSON Data</label>
                <textarea
                  value={uploadText}
                  onChange={(e) => setUploadText(e.target.value)}
                  rows={10}
                  placeholder='Paste your JSON array of questions here...'
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0] resize-none font-mono"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkUpload}
                  disabled={uploading || !uploadText.trim()}
                  className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  Upload Questions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
