"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Search, MonitorPlay, Loader2, Clock, CheckCircle2, ChevronRight, Lock } from 'lucide-react';
import Link from 'next/link';

export default function CBTStudentPortal() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isReadOnly = userRole !== 'STAFF' && userRole !== 'ADMIN';

  const [entranceExams, setEntranceExams] = useState<any[]>([]);
  const [internalExams, setInternalExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState('');
  const [studentClassId, setStudentClassId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const [entRes, intRes] = await Promise.all([
          fetch('/api/exams'),
          fetch('/api/internal-exams')
        ]);
        const entData = await entRes.json();
        const intData = await intRes.json();
        
        if (entData.success) setEntranceExams(entData.data);
        if (intData.success) {
          // Only show Active internal exams
          setInternalExams(intData.data.filter((e: any) => e.isActive));
        }
      } catch (err) {
        console.error("Failed to fetch exams");
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

  // When ID reaches expected length, silently verify them in DB to get their Class
  useEffect(() => {
    // If logged in as student, pre-fill ID
    if (userRole === 'STUDENT' && session?.user?.id) {
      if (studentId !== session.user.id) {
        setStudentId(session.user.id);
      }
    }

    if (studentId.length >= 10) {
      setIsVerifying(true);
      fetch('/api/students')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const stu = data.data.find((s: any) => s.id === studentId.toUpperCase());
            if (stu) setStudentClassId(stu.classId);
          }
        })
        .finally(() => setIsVerifying(false));
    } else {
      setStudentClassId('');
    }
  }, [studentId]);

  // Filter internal exams so a student only sees exams meant for their specific class
  const availableInternalExams = studentClassId 
    ? internalExams.filter(exam => exam.classId === studentClassId)
    : [];

  return (
    <div className="space-y-6 pb-32 max-w-5xl mx-auto">
      <div className="bg-[#0A192F] rounded-2xl p-8 text-white relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-20 -mr-20 -mt-20"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <MonitorPlay className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-black tracking-tight">Student Testing Portal</h1>
          </div>
          <p className="text-slate-400 max-w-lg">Welcome to the Computer Based Testing (CBT) center. Please enter your Student ID below to unlock your assigned examinations.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full max-w-md">
          <label className="block text-sm font-bold text-slate-700 mb-1">Verify Student ID</label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={userRole === 'STUDENT'}
              placeholder="e.g. DIT/STU/001" 
              className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>
        </div>
        <div className="pb-2">
          {isVerifying && <Loader2 className="w-5 h-5 animate-spin text-[#0033A0]" />}
          {!isVerifying && studentId.length >= 10 && studentClassId && (
            <span className="flex items-center gap-2 text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" /> Identity Verified
            </span>
          )}
          {!isVerifying && studentId.length >= 10 && !studentClassId && (
            <span className="flex items-center gap-2 text-red-600 font-bold text-sm bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
              Student not found
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" /></div>
      ) : (
        <div className="space-y-8">
          
          {/* INTERNAL EXAMS SECTION */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">Class Assessments (Internal)</h2>
            {availableInternalExams.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-500 text-sm font-medium">
                No active internal exams available for your class.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableInternalExams.map((exam) => (
                  <div key={exam.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all group flex flex-col">
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-100 text-indigo-800">Termly Exam</span>
                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded"><Clock className="w-3.5 h-3.5" /> {exam.durationMinutes} mins</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-xl mb-1">{exam.title}</h3>
                      <p className="text-sm font-bold text-indigo-600 mb-6">{exam.subject?.name}</p>
                    </div>
                    
                    {studentClassId ? (
                      <Link href={`/cbt/internal/${exam.id}?studentId=${encodeURIComponent(studentId)}`} className="w-full bg-[#0A192F] hover:bg-[#0033A0] text-white font-bold py-3 rounded-lg text-sm transition-colors flex justify-center items-center gap-2 group-hover:shadow-lg">
                        Start Examination <ChevronRight className="w-4 h-4" />
                      </Link>
                    ) : (
                      <button disabled className="w-full bg-slate-100 text-slate-400 font-bold py-3 rounded-lg text-sm flex justify-center items-center gap-2 cursor-not-allowed">
                        <Lock className="w-4 h-4" /> Verify ID to Unlock
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ENTRANCE EXAMS SECTION */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">Entrance Exams (External Candidates)</h2>
            {entranceExams.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-500 text-sm font-medium">
                No entrance exams currently scheduled.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {entranceExams.map((exam) => (
                  <div key={exam.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all group flex flex-col">
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-blue-100 text-blue-800">Entrance Test</span>
                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded"><Clock className="w-3.5 h-3.5" /> {exam.durationMinutes} mins</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-xl mb-2">{exam.title}</h3>
                      <p className="text-sm text-slate-500 mb-6">{exam._count?.questions || 0} Questions</p>
                    </div>
                    
                    {studentId.length >= 10 ? (
                      <Link href={`/cbt/${exam.id}?studentId=${encodeURIComponent(studentId)}`} className="w-full bg-[#0A192F] hover:bg-[#0033A0] text-white font-bold py-3 rounded-lg text-sm transition-colors flex justify-center items-center gap-2 group-hover:shadow-lg">
                        Start Examination <ChevronRight className="w-4 h-4" />
                      </Link>
                    ) : (
                      <button disabled className="w-full bg-slate-100 text-slate-400 font-bold py-3 rounded-lg text-sm flex justify-center items-center gap-2 cursor-not-allowed">
                        <Lock className="w-4 h-4" /> Enter Candidate ID
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
