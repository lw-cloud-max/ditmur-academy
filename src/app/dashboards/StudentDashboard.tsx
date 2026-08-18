"use client";

import { useState, useEffect } from 'react';
import { BookOpen, GraduationCap, Trophy, MonitorPlay, Loader2, Calendar } from 'lucide-react';
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-emerald-300 transition-colors">
          <div className="p-4 bg-emerald-100 text-emerald-600 rounded-xl"><GraduationCap className="w-8 h-8" /></div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase">Current Average</p>
            <h3 className="text-3xl font-black text-slate-900">{average}%</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-amber-300 transition-colors">
          <div className="p-4 bg-amber-100 text-amber-600 rounded-xl"><Trophy className="w-8 h-8" /></div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase">CBT Exams Taken</p>
            <h3 className="text-3xl font-black text-slate-900">{student.internalResults.length + student.cbtResults.length}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-blue-300 transition-colors">
          <div className="p-4 bg-blue-100 text-blue-600 rounded-xl"><BookOpen className="w-8 h-8" /></div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase">Enrolled Subjects</p>
            <h3 className="text-3xl font-black text-slate-900">{student.grades.length}</h3>
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
        </div>

      </div>
    </div>
  );
}
