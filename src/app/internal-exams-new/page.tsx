"use client";

import { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Loader2, X, Save, Clock, Users, BookOpen, 
  CheckCircle2, AlertCircle, Play, Pause, Eye, Trash2, Edit2, Settings
} from 'lucide-react';
import Link from 'next/link';

interface Exam {
  id: string;
  title: string;
  description?: string;
  subject: { id: string; name: string };
  class?: { id: string; name: string };
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  startTime?: string;
  endTime?: string;
  isActive: boolean;
  shuffleQuestions: boolean;
  showResults: boolean;
  creator: { firstName: string; lastName: string };
  _count: { questions: number; attempts: number };
  createdAt: string;
}

export default function InternalExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newExam, setNewExam] = useState({
    title: '', description: '', subjectId: '', classId: '', 
    durationMinutes: 60, totalMarks: 100, passingMarks: 40,
    startTime: '', endTime: '', shuffleQuestions: false, showResults: false
  });

  useEffect(() => {
    fetchExams();
    fetchSubjectsAndClasses();
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/internal-exams-new');
      const data = await res.json();
      if (data.success) {
        setExams(data.data);
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
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
      console.error('Error fetching data:', error);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    // Note: This will need question selection - for now just create the exam structure
    alert('To create an exam, please go to the Question Bank first, select questions, then create the exam from there.');
    setIsCreating(false);
  };

  const handleToggleActive = async (examId: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/internal-exams-new', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: examId, isActive: !currentStatus })
      });
      const data = await res.json();
      if (data.success) {
        fetchExams();
      }
    } catch (error) {
      console.error('Error toggling exam status:', error);
    }
  };

  const handleDeleteExam = async (examId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This will also delete all attempts.`)) return;
    
    try {
      const res = await fetch(`/api/internal-exams-new?id=${examId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchExams();
        alert('Exam deleted successfully!');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting exam:', error);
    }
  };

  const filteredExams = exams.filter(exam => {
    const matchesSearch = 
      exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.subject.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || 
      (filterStatus === 'ACTIVE' && exam.isActive) ||
      (filterStatus === 'INACTIVE' && !exam.isActive);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-32 max-w-7xl mx-auto animation-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-[#0033A0]" />
            Internal Exams
          </h1>
          <p className="text-slate-500 mt-1">Create and manage exams for students</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/internal-question-bank"
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <BookOpen className="w-5 h-5" />
            Question Bank
          </Link>
          <Link
            href="/internal-exams-new/create"
            className="px-6 py-3 bg-[#0033A0] text-white rounded-xl font-bold hover:bg-[#002277] transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Exam
          </Link>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-blue-800">How to create an exam:</p>
          <ol className="text-sm text-blue-700 mt-1 space-y-1">
            <li>1. Go to <strong>Question Bank</strong> and add questions</li>
            <li>2. Come back here and create an exam</li>
            <li>3. Select questions from the bank</li>
            <li>4. Activate the exam for students to take</li>
          </ol>
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
              placeholder="Search exams..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Exams List */}
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" />
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-xl border border-slate-200">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-700">No exams found</p>
          <p className="text-sm text-slate-500 mt-1">Create questions in the Question Bank first, then create exams here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map(exam => (
            <div key={exam.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 text-lg mb-1">{exam.title}</h3>
                    <p className="text-sm text-[#0033A0] font-medium">
                      {exam.subject.name} {exam.class ? `• ${exam.class.name}` : '• All Classes'}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    exam.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {exam.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {exam.description && (
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">{exam.description}</p>
                )}

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500">Questions</p>
                    <p className="font-bold text-slate-900">{exam._count.questions}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500">Duration</p>
                    <p className="font-bold text-slate-900">{exam.durationMinutes} min</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500">Total Marks</p>
                    <p className="font-bold text-slate-900">{exam.totalMarks}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500">Attempts</p>
                    <p className="font-bold text-slate-900">{exam._count.attempts}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleActive(exam.id, exam.isActive)}
                    className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 ${
                      exam.isActive 
                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' 
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {exam.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {exam.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <Link
                    href={`/internal-exams-new/${exam.id}`}
                    className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-bold text-sm hover:bg-blue-100 flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Link>
                  <button
                    onClick={() => handleDeleteExam(exam.id, exam.title)}
                    className="px-4 py-2 bg-red-50 text-red-700 rounded-lg font-bold text-sm hover:bg-red-100"
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
  );
}
