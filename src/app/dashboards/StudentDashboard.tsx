"use client";

import { useState, useEffect } from 'react';
import { BookOpen, GraduationCap, Trophy, MonitorPlay, Loader2, Calendar, Bot, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function StudentDashboard({ studentId }: { studentId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Force normalize the ID on the frontend before sending it to the API
  const cleanId = studentId ? encodeURIComponent(studentId.toUpperCase().trim()) : '';

  useEffect(() => {
    if (!cleanId) {
      setLoading(false);
      return;
    }
    
    fetch(`/api/student-dashboard?studentId=${cleanId}`)
      .then(res => res.json())
      .then(result => {
        if (result.success) setData(result.data);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [cleanId]);

  if (loading) {
    return <div className="p-20 flex justify-center"><Loader2 className="w-12 h-12 text-[#0033A0] animate-spin" /></div>;
  }

  if (!data || !data.student) return <div className="p-12 text-center text-slate-500 font-medium">Student profile not found in database for ID: {studentId}</div>;

  const { student, average, upcomingExams } = data;

  return (
    <div className="space-y-6 pb-32 max-w-6xl mx-auto animation-fade-in">
      
      {/* HEADER */}
      <div className="bg-gradient-to-br from-[#0A192F] via-[#002277] to-[#0033A0] rounded-3xl p-8 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700] rounded-full blur-3xl opacity-20 -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400 rounded-full blur-3xl opacity-10 -ml-12 -mb-12"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-full border-4 border-white/20 bg-white/10 overflow-hidden relative shrink-0 backdrop-blur-md">
            {student.imageUrl ? (
              <img src={student.imageUrl} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-black text-2xl">
                {student.firstName[0]}{student.lastName[0]}
              </div>
            )}
          </div>
          <div className="text-center md:text-left text-white">
            <h1 className="text-3xl font-black tracking-tight">Welcome back, {student.firstName}! 👋</h1>
            <p className="text-[#FFD700] font-bold tracking-wide mt-1">{student.id} • {student.class?.name || 'Unassigned'}</p>
            <p className="text-blue-200 text-sm mt-2">Ready to continue learning?</p>
          </div>
        </div>
      </div>

      {/* AI TUTOR PROMO */}
      <Link href="/ai-tutor" className="group block bg-gradient-to-r from-[#FFD700] to-[#FFA500] rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md group-hover:scale-110 transition-transform">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> AI Tutor Now Available!
            </h3>
            <p className="text-white/80 text-sm mt-1">Get instant help with any subject. Ask questions, understand concepts, and ace your exams!</p>
          </div>
          <ArrowRight className="w-6 h-6 text-white group-hover:translate-x-2 transition-transform" />
        </div>
      </Link>

      {/* QUICK STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-emerald-100 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase">Current Average</p>
              <h3 className="text-3xl font-black text-slate-900">{average}%</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-amber-100 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase">CBT Exams Taken</p>
              <h3 className="text-3xl font-black text-slate-900">{student.internalResults.length + student.cbtResults.length}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-blue-100 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase">Enrolled Subjects</p>
              <h3 className="text-3xl font-black text-slate-900">{student.grades.length}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* UPCOMING EXAMS */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MonitorPlay className="w-5 h-5 text-[#0033A0]" /> Upcoming Assessments
          </h2>
          {upcomingExams.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500">
              <MonitorPlay className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-bold">No active exams.</p>
              <p className="text-sm">Enjoy your study time! 📚</p>
            </div>
          ) : (
            upcomingExams.map((exam: any) => {
              const hasTaken = student.internalResults.some((r: any) => r.examId === exam.id);
              
              return (
                <div key={exam.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{exam.title}</h3>
                    <p className="text-sm text-[#0033A0] font-medium">{exam.subject?.name}</p>
                  </div>
                  {hasTaken ? (
                    <span className="px-4 py-2 bg-emerald-50 text-emerald-700 font-bold text-sm rounded-lg flex items-center gap-2">
                      ✓ Completed
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

        {/* QUICK ACTIONS */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#0033A0]" /> Quick Actions
          </h2>
          
          <Link href="/ai-tutor" className="block bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-5 text-white hover:shadow-lg transition-all hover:-translate-y-1">
            <Bot className="w-8 h-8 mb-3" />
            <h3 className="font-bold text-lg mb-1">AI Tutor</h3>
            <p className="text-sm text-white/80">Get instant homework help</p>
          </Link>
          
          <Link href="/timetable" className="block bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
            <Calendar className="w-8 h-8 text-[#0033A0] mb-3" />
            <h3 className="font-bold text-lg text-slate-900 mb-1">Timetable</h3>
            <p className="text-sm text-slate-500">View your class schedule</p>
          </Link>
          
          <Link href="/study-hub" className="block bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
            <BookOpen className="w-8 h-8 text-emerald-600 mb-3" />
            <h3 className="font-bold text-lg text-slate-900 mb-1">Study Hub</h3>
            <p className="text-sm text-slate-500">Flashcards & trivia games</p>
          </Link>
        </div>

      </div>
    </div>
  );
}
