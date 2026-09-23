"use client";

import { useState, useEffect } from 'react';
import { 
  BookOpen, Clock, Users, Loader2, Play, CheckCircle2, AlertCircle, 
  Calendar, Trophy, ArrowRight
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
  _count: { questions: number; attempts: number };
}

export default function MyExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [myAttempts, setMyAttempts] = useState<any[]>([]);

  useEffect(() => {
    fetchExams();
    fetchMyAttempts();
  }, []);

  const fetchExams = async () => {
    try {
      const res = await fetch('/api/internal-exams-new?status=ACTIVE');
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

  const fetchMyAttempts = async () => {
    try {
      const res = await fetch('/api/internal-exams-new/take');
      const data = await res.json();
      if (data.success) {
        setMyAttempts(data.data);
      }
    } catch (error) {
      console.error('Error fetching attempts:', error);
    }
  };

  const hasAttempted = (examId: string) => {
    return myAttempts.some(a => a.examId === examId);
  };

  const getAttemptResult = (examId: string) => {
    return myAttempts.find(a => a.examId === examId);
  };

  const isExamAvailable = (exam: Exam) => {
    if (!exam.isActive) return false;
    if (exam.startTime && new Date(exam.startTime) > new Date()) return false;
    if (exam.endTime && new Date(exam.endTime) < new Date()) return false;
    return true;
  };

  return (
    <div className="space-y-6 pb-32 max-w-6xl mx-auto animation-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-[#0033A0] to-[#002277] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <BookOpen className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-2">My Exams</h1>
        <p className="text-slate-500">Take your scheduled internal exams</p>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-blue-800">How to take an exam:</p>
          <ol className="text-sm text-blue-700 mt-1 space-y-1">
            <li>1. Find an active exam below</li>
            <li>2. Click "Start Exam"</li>
            <li>3. Answer all questions within the time limit</li>
            <li>4. Submit your answers</li>
            <li>5. View your results (if enabled by teacher)</li>
          </ol>
        </div>
      </div>

      {/* Exams List */}
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" />
        </div>
      ) : exams.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-xl border border-slate-200">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-700">No exams available</p>
          <p className="text-sm text-slate-500 mt-1">Check back later for scheduled exams</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exams.map(exam => {
            const attempted = hasAttempted(exam.id);
            const attempt = getAttemptResult(exam.id);
            const available = isExamAvailable(exam);

            return (
              <div key={exam.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-slate-900 text-xl mb-2">{exam.title}</h3>
                      <p className="text-[#0033A0] font-medium">{exam.subject.name}</p>
                      {exam.class && (
                        <p className="text-sm text-slate-500 mt-1">Class: {exam.class.name}</p>
                      )}
                    </div>
                    {attempted && (
                      <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                        attempt.isPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {attempt.isPassed ? 'Passed' : 'Failed'}
                      </div>
                    )}
                  </div>

                  {exam.description && (
                    <p className="text-sm text-slate-600 mb-4">{exam.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <BookOpen className="w-4 h-4 text-slate-400" />
                      <span>{exam._count.questions} questions</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>{exam.durationMinutes} minutes</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Trophy className="w-4 h-4 text-slate-400" />
                      <span>{exam.totalMarks} marks</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>{exam._count.attempts} attempted</span>
                    </div>
                  </div>

                  {exam.startTime && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                      <Calendar className="w-4 h-4" />
                      <span>Starts: {new Date(exam.startTime).toLocaleString()}</span>
                    </div>
                  )}

                  {attempted ? (
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">Your Score</span>
                        <span className={`font-bold text-lg ${
                          attempt.isPassed ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {attempt.score}/{attempt.totalMarks}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${attempt.isPassed ? 'bg-emerald-500' : 'bg-red-500'}`}
                          style={{ width: `${(attempt.score / attempt.totalMarks) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        {attempt.isPassed ? '✓ Passed' : '✗ Did not pass'} (Passing: {exam.passingMarks} marks)
                      </p>
                    </div>
                  ) : available ? (
                    <Link
                      href={`/my-exams/${exam.id}/take`}
                      className="w-full py-3 bg-[#0033A0] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#002277] transition-colors"
                    >
                      <Play className="w-5 h-5" />
                      Start Exam
                    </Link>
                  ) : (
                    <div className="w-full py-3 bg-slate-100 text-slate-500 rounded-xl font-bold flex items-center justify-center gap-2">
                      <Clock className="w-5 h-5" />
                      {!exam.isActive ? 'Not Available' : 'Not Started Yet'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
