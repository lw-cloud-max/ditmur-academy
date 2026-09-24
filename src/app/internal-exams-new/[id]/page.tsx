"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  BookOpen, Clock, Users, Loader2, ArrowLeft, Play, Pause, Eye, 
  CheckCircle2, AlertCircle, Calendar, Trophy, Settings
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
  questions: any[];
  attempts: any[];
  createdAt: string;
}

export default function ExamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = session?.user?.role || 'STAFF';
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetchExam();
  }, [params.id]);

  const fetchExam = async () => {
    try {
      const res = await fetch(`/api/internal-exams-new?id=${params.id}`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setExam(data.data[0]);
      }
    } catch (error) {
      console.error('Error fetching exam:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!exam) return;
    setToggling(true);
    try {
      const res = await fetch('/api/internal-exams-new', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: exam.id, isActive: !exam.isActive })
      });
      const data = await res.json();
      if (data.success) {
        setExam({ ...exam, isActive: !exam.isActive });
      }
    } catch (error) {
      console.error('Error toggling exam:', error);
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="text-center p-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Exam Not Found</h2>
        <p className="text-slate-500 mb-4">The exam you're looking for doesn't exist.</p>
        <Link href="/internal-exams-new" className="text-[#0033A0] font-bold">
          ← Back to Exams
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-32 animation-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/internal-exams-new"
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{exam.title}</h1>
          <p className="text-slate-500 mt-1">
            {exam.subject.name} {exam.class ? `• ${exam.class.name}` : '• All Classes'}
          </p>
        </div>
        {(userRole === 'ADMIN' || userRole === 'STAFF') && (
          <button
            onClick={handleToggleActive}
            disabled={toggling}
            className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 ${
              exam.isActive 
                ? 'bg-amber-500 text-white hover:bg-amber-600' 
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
            }`}
          >
            {toggling ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : exam.isActive ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
            {exam.isActive ? 'Deactivate' : 'Activate'}
          </button>
        )}
      </div>

      {/* Exam Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-slate-500">Duration</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{exam.durationMinutes} min</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-medium text-slate-500">Questions</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{exam.questions.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-amber-600" />
            <span className="text-sm font-medium text-slate-500">Total Marks</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{exam.totalMarks}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-slate-500">Attempts</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{exam.attempts.length}</p>
        </div>
      </div>

      {/* Exam Details */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#0033A0]" />
          Exam Details
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-500">Passing Marks</p>
            <p className="font-bold text-slate-900">{exam.passingMarks} marks</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Status</p>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              exam.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {exam.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div>
            <p className="text-sm text-slate-500">Shuffle Questions</p>
            <p className="font-bold text-slate-900">{exam.shuffleQuestions ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Show Results</p>
            <p className="font-bold text-slate-900">{exam.showResults ? 'Yes' : 'No'}</p>
          </div>
          {exam.startTime && (
            <div>
              <p className="text-sm text-slate-500">Start Time</p>
              <p className="font-bold text-slate-900">{new Date(exam.startTime).toLocaleString()}</p>
            </div>
          )}
          {exam.endTime && (
            <div>
              <p className="text-sm text-slate-500">End Time</p>
              <p className="font-bold text-slate-900">{new Date(exam.endTime).toLocaleString()}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-slate-500">Created By</p>
            <p className="font-bold text-slate-900">{exam.creator.firstName} {exam.creator.lastName}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Created At</p>
            <p className="font-bold text-slate-900">{new Date(exam.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#0033A0]" />
          Questions ({exam.questions.length})
        </h2>
        <div className="space-y-4">
          {exam.questions.map((q, index) => (
            <div key={q.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="font-medium text-slate-900 mb-2">
                {index + 1}. {q.text}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className={`p-2 rounded ${q.correctAnswer === 'A' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-white'}`}>
                  A. {q.optionA}
                </div>
                <div className={`p-2 rounded ${q.correctAnswer === 'B' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-white'}`}>
                  B. {q.optionB}
                </div>
                <div className={`p-2 rounded ${q.correctAnswer === 'C' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-white'}`}>
                  C. {q.optionC}
                </div>
                <div className={`p-2 rounded ${q.correctAnswer === 'D' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-white'}`}>
                  D. {q.optionD}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}