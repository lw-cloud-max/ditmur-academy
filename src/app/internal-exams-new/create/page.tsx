"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, Clock, Users, Loader2, Save, ArrowLeft, Plus, Trash2, 
  CheckCircle2, AlertCircle, GripVertical, Settings
} from 'lucide-react';
import Link from 'next/link';

interface Question {
  id: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  topic?: string;
  difficulty: string;
}

export default function CreateExamPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subjectId: '',
    classId: '',
    durationMinutes: 60,
    totalMarks: 100,
    passingMarks: 40,
    startTime: '',
    endTime: '',
    shuffleQuestions: false,
    showResults: false
  });

  useEffect(() => {
    fetchSubjectsAndClasses();
  }, []);

  useEffect(() => {
    if (formData.subjectId) {
      fetchQuestions();
    }
  }, [formData.subjectId]);

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
      console.error('Error fetching data:', error);
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/internal-question-bank?subjectId=${formData.subjectId}`);
      const data = await res.json();
      if (data.success) {
        setAvailableQuestions(data.data);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = (question: Question) => {
    if (!selectedQuestions.find(q => q.id === question.id)) {
      setSelectedQuestions([...selectedQuestions, question]);
    }
  };

  const removeQuestion = (questionId: string) => {
    setSelectedQuestions(selectedQuestions.filter(q => q.id !== questionId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedQuestions.length === 0) {
      alert('Please select at least one question');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/internal-exams-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          questionIds: selectedQuestions.map(q => q.id)
        })
      });

      const data = await res.json();
      if (data.success) {
        alert('Exam created successfully!');
        router.push('/internal-exams-new');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating exam:', error);
      alert('Failed to create exam');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-32 animation-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/internal-exams-new"
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create New Exam</h1>
          <p className="text-slate-500 mt-1">Set up a timed exam for students</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Exam Details */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#0033A0]" />
            Exam Details
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Exam Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="e.g., Mid-Term Mathematics Exam"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
              <select
                required
                value={formData.subjectId}
                onChange={(e) => setFormData({...formData, subjectId: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
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
                value={formData.classId}
                onChange={(e) => setFormData({...formData, classId: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
              >
                <option value="">All Classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={2}
                placeholder="Brief description of the exam..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0] resize-none"
              />
            </div>
          </div>
        </div>

        {/* Timing & Scoring */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#0033A0]" />
            Timing & Scoring
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Duration (Minutes) *</label>
              <input
                type="number"
                required
                min="5"
                max="300"
                value={formData.durationMinutes}
                onChange={(e) => setFormData({...formData, durationMinutes: parseInt(e.target.value)})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Total Marks *</label>
              <input
                type="number"
                required
                min="1"
                value={formData.totalMarks}
                onChange={(e) => setFormData({...formData, totalMarks: parseInt(e.target.value)})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Passing Marks *</label>
              <input
                type="number"
                required
                min="1"
                value={formData.passingMarks}
                onChange={(e) => setFormData({...formData, passingMarks: parseInt(e.target.value)})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Time (Optional)</label>
              <input
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Time (Optional)</label>
              <input
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
              />
            </div>
          </div>

          <div className="flex gap-6 mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.shuffleQuestions}
                onChange={(e) => setFormData({...formData, shuffleQuestions: e.target.checked})}
                className="w-4 h-4 text-[#0033A0] rounded"
              />
              <span className="text-sm font-medium text-slate-700">Shuffle Questions</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.showResults}
                onChange={(e) => setFormData({...formData, showResults: e.target.checked})}
                className="w-4 h-4 text-[#0033A0] rounded"
              />
              <span className="text-sm font-medium text-slate-700">Show Results After Submit</span>
            </label>
          </div>
        </div>

        {/* Question Selection */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#0033A0]" />
            Select Questions
          </h2>

          {!formData.subjectId ? (
            <div className="text-center p-8 text-slate-500">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p>Please select a subject first to see available questions</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Available Questions */}
              <div>
                <h3 className="font-bold text-slate-700 mb-3">
                  Available Questions ({availableQuestions.length})
                </h3>
                <div className="max-h-96 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-3">
                  {loading ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="w-6 h-6 animate-spin text-[#0033A0]" />
                    </div>
                  ) : availableQuestions.length === 0 ? (
                    <p className="text-center text-slate-500 p-4">No questions available for this subject</p>
                  ) : (
                    availableQuestions.map(q => (
                      <div
                        key={q.id}
                        className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-[#0033A0] transition-colors cursor-pointer"
                        onClick={() => addQuestion(q)}
                      >
                        <p className="text-sm font-medium text-slate-900 mb-1">{q.text}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className={`px-2 py-0.5 rounded ${
                            q.difficulty === 'EASY' ? 'bg-green-100 text-green-700' :
                            q.difficulty === 'HARD' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {q.difficulty}
                          </span>
                          {q.topic && <span>{q.topic}</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Selected Questions */}
              <div>
                <h3 className="font-bold text-slate-700 mb-3">
                  Selected Questions ({selectedQuestions.length})
                </h3>
                <div className="max-h-96 overflow-y-auto space-y-2 border border-[#0033A0] rounded-xl p-3 bg-blue-50/50">
                  {selectedQuestions.length === 0 ? (
                    <p className="text-center text-slate-500 p-4">Click questions on the left to add them</p>
                  ) : (
                    selectedQuestions.map((q, index) => (
                      <div
                        key={q.id}
                        className="p-3 bg-white rounded-lg border border-blue-200 flex items-start gap-3"
                      >
                        <span className="w-6 h-6 bg-[#0033A0] text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{q.text}</p>
                        </div>
                        <button
                          onClick={() => removeQuestion(q.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                {selectedQuestions.length > 0 && (
                  <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="text-sm font-bold text-emerald-800">
                      Total Marks: {selectedQuestions.length} questions × {Math.floor(formData.totalMarks / selectedQuestions.length)} marks each = {formData.totalMarks} marks
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link
            href="/internal-exams-new"
            className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || selectedQuestions.length === 0}
            className="px-8 py-3 bg-[#0033A0] text-white rounded-xl font-bold hover:bg-[#002277] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Create Exam
          </button>
        </div>
      </form>
    </div>
  );
}
