"use client";

import { useState, useEffect } from 'react';
import { BookOpen, GraduationCap, Trophy, MonitorPlay, Loader2, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function StudentDashboard({ studentId }: { studentId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [studyResults, setStudyResults] = useState<Array<{ id: string; studentId: string; subjectName: string; score: number; total: number; percentage: number; completedAt: string }>>([]);

  const cleanId = studentId ? encodeURIComponent(studentId.toUpperCase().trim()) : '';
  const normalizedStudentId = studentId?.trim().toUpperCase() || '';

  useEffect(() => {
    if (!cleanId) {
      setLoading(false);
      return;
    }

    try {
      if (typeof window !== 'undefined') {
        const storedResults = JSON.parse(window.localStorage.getItem('studyQuizResults') || '[]');
        const studentResults = (storedResults || []).filter((entry: any) => String(entry.studentId).toUpperCase() === normalizedStudentId);
        setStudyResults(studentResults.slice(0, 5));
      }
    } catch (error) {
      console.error('Unable to read study results from local storage:', error);
    }

    fetch(`/api/student-dashboard?studentId=${cleanId}`)
      .then(res => res.json())
      .then(result => {
        if (result.success) setData(result.data);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [cleanId, normalizedStudentId]);

  if (loading) {
    return <div className="p-20 flex justify-center"><Loader2 className="w-12 h-12 text-[#0033A0] animate-spin" /></div>;
  }

  if (!data || !data.student) return <div className="p-12 text-center text-slate-500 font-medium">Student profile not found in database for ID: {studentId}</div>;

  const { student, average, upcomingExams, recentStudyResults = [] } = data;

  const combinedStudyEntries = [...studyResults, ...recentStudyResults].filter(Boolean);
  const allStudyEntries = Array.from(
    new Map(
      combinedStudyEntries.map((entry: any) => {
        const uniqueKey = `${entry.id || entry.subjectName || 'study'}-${entry.subject?.name || entry.subjectName || 'study'}-${entry.completedAt || Date.now()}-${entry.score ?? 0}-${entry.total ?? entry.totalQuestions ?? 0}`;
        return [uniqueKey, entry];
      })
    ).values()
  );

  const subjectPerformance = allStudyEntries.reduce((acc: Record<string, { name: string; total: number; score: number; count: number; average: number }>, result: any) => {
    const name = result.subject?.name || result.subjectName || 'Study';
    if (!acc[name]) {
      acc[name] = { name, total: 0, score: 0, count: 0, average: 0 };
    }

    const score = Number(result.score ?? 0);
    const total = Number(result.totalQuestions ?? result.total ?? 0);
    const percentage = Number(result.percentage ?? (total ? (score / total) * 100 : 0));

    acc[name].total += total;
    acc[name].score += score;
    acc[name].count += 1;

    if (total > 0) {
      acc[name].average = Math.round((acc[name].score / acc[name].total) * 100);
    } else {
      acc[name].average = Math.round(percentage);
    }

    return acc;
  }, {});

  const topSubjectPerformance = Object.values(subjectPerformance)
    .sort((a: any, b: any) => b.average - a.average)
    .slice(0, 4);

  const bestScore = allStudyEntries.length
    ? Math.max(...allStudyEntries.map((entry: any) => Number(entry.percentage ?? 0)))
    : 0;

  const uniqueStudyDates = Array.from(
    new Set(
      allStudyEntries
        .map((entry: any) => new Date(entry.completedAt || Date.now()).toISOString().slice(0, 10))
        .filter(Boolean)
    )
  ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  let streak = 0;
  const today = new Date();
  const checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  for (let i = 0; i < 365; i++) {
    const target = new Date(checkDate);
    target.setDate(checkDate.getDate() - i);
    const key = target.toISOString().slice(0, 10);

    if (uniqueStudyDates.includes(key)) {
      streak += 1;
    } else if (i > 0) {
      break;
    }
  }

  return (
    <div className="space-y-6 pb-32 max-w-6xl mx-auto animation-fade-in">
      
      {/* HEADER */}
      <div className="bg-[#0A192F] rounded-3xl p-8 relative overflow-hidden shadow-lg flex flex-col md:flex-row items-center gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#0033A0] rounded-full blur-3xl opacity-50 -mr-20 -mt-20"></div>
        
        <div className="w-24 h-24 rounded-full border-4 border-white bg-slate-200 overflow-hidden relative z-10 shrink-0">
          {student.imageUrl ? (
            <img src={student.imageUrl} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 font-black text-2xl">
              {student.firstName[0]}{student.lastName[0]}
            </div>
          )}
        </div>
        <div className="relative z-10 text-center md:text-left text-white">
          <h1 className="text-3xl font-black tracking-tight">Welcome, {student.firstName}!</h1>
          <p className="text-[#FFD700] font-bold tracking-wide mt-1">{student.id} • {student.class?.name || 'Unassigned'}</p>
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-emerald-300 transition-colors">
          <div className="p-4 bg-emerald-100 text-emerald-600 rounded-xl"><GraduationCap className="w-8 h-8" /></div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase">Current Average</p>
            <h3 className="text-3xl font-black text-slate-900">{Number(average || 0).toFixed(1)}%</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-amber-300 transition-colors">
          <div className="p-4 bg-amber-100 text-amber-600 rounded-xl"><Trophy className="w-8 h-8" /></div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase">Best Score</p>
            <h3 className="text-3xl font-black text-slate-900">{bestScore}%</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-blue-300 transition-colors">
          <div className="p-4 bg-blue-100 text-blue-600 rounded-xl"><BookOpen className="w-8 h-8" /></div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase">Study Streak</p>
            <h3 className="text-3xl font-black text-slate-900">{streak}d</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-violet-300 transition-colors">
          <div className="p-4 bg-violet-100 text-violet-600 rounded-xl"><MonitorPlay className="w-8 h-8" /></div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase">CBT Exams</p>
            <h3 className="text-3xl font-black text-slate-900">{(student.internalResults?.length ?? 0) + (student.cbtResults?.length ?? 0)}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-[#0033A0]" /> Subject Performance
            </h2>

            {topSubjectPerformance.length === 0 ? (
              <p className="text-sm text-slate-500">Take a quiz to see subject-level progress.</p>
            ) : (
              <div className="space-y-4">
                {topSubjectPerformance.map((item: any) => (
                  <div key={item.name}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold text-slate-700">{item.name}</span>
                      <span className="text-xs font-bold text-[#0033A0]">{item.average}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#0033A0] to-[#4F8EF7]"
                        style={{ width: `${Math.min(item.average, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#0033A0]" /> Recent Study Results
          </h2>

          {allStudyEntries.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-slate-500">
              <p className="font-bold">No study quiz results saved yet.</p>
              <p className="text-sm mt-1">Complete a quiz in the Study Hub to start tracking your progress.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allStudyEntries.slice(0, 5).map((result: any) => (
                <div key={result.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900">{result.subjectName}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(result.completedAt).toLocaleDateString()} • {new Date(result.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-[#0033A0] text-xl">{result.percentage}%</p>
                      <p className="text-xs text-slate-500">{result.score}/{result.total} correct</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* UPCOMING EXAMS */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MonitorPlay className="w-5 h-5 text-[#0033A0]" /> Upcoming Assessments
          </h2>
          {upcomingExams.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500">
              <p className="font-bold">No active exams.</p>
              <p className="text-sm">Enjoy your study time!</p>
            </div>
          ) : (
            upcomingExams.map((exam: any) => {
              const hasTaken = student.internalResults.some((r: any) => r.examId === exam.id);
              
              return (
                <div key={exam.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{exam.title}</h3>
                    <p className="text-sm text-[#0033A0] font-medium">{exam.subject?.name}</p>
                  </div>
                  {hasTaken ? (
                    <span className="px-4 py-2 bg-emerald-50 text-emerald-700 font-bold text-sm rounded-lg flex items-center gap-2">
                      Completed
                    </span>
                  ) : (
                    <Link href={`/cbt`} className="px-6 py-2.5 bg-[#0033A0] hover:bg-[#002277] text-white rounded-lg text-sm font-bold shadow-sm transition-colors">
                      Enter Portal
                    </Link>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* QUICK ACTION TILE */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#0033A0]" /> Today's Schedule
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-900 mb-2">View Timetable</h3>
            <p className="text-sm text-slate-500 mb-4">Check what classes you have scheduled for today.</p>
            <Link href="/timetable" className="inline-block w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors">
              Open Timetable
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#FFD700]" /> Recent Study Results
            </h3>
            {recentStudyResults.length === 0 ? (
              <p className="text-sm text-slate-500">No study sessions yet. Start your first quiz in the Study Hub.</p>
            ) : (
              <div className="space-y-3">
                {recentStudyResults.slice(0, 4).map((result: any, index: number) => (
                  <div key={`${result.subject?.name || 'subject'}-${index}`} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">{result.subject?.name || 'Study'}</span>
                      <span className="text-[#0033A0] font-bold text-sm">{result.percentage}%</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {result.score}/{result.totalQuestions} correct
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
