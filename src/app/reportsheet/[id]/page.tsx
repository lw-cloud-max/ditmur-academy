"use client";

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2, Printer, ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';

const getOrdinalSuffix = (i: number) => {
  const j = i % 10, k = i % 100;
  if (j == 1 && k != 11) return i + "st";
  if (j == 2 && k != 12) return i + "nd";
  if (j == 3 && k != 13) return i + "rd";
  return i + "th";
};

const getRemark = (total: number) => {
  if (total >= 75) return "Excellent";
  if (total >= 65) return "Very Good";
  if (total >= 55) return "Good";
  if (total >= 45) return "Fair";
  if (total >= 40) return "Pass";
  return "Poor";
};

export default function ReportSheetPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isReadOnly = userRole !== 'STAFF' && userRole !== 'ADMIN';

  const params = useParams();
  const searchParams = useSearchParams();
  const studentId = decodeURIComponent(params.id as string);
  const classId = searchParams.get('classId');
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // AI Comment States
  const [teacherComment, setTeacherComment] = useState("This is an excellent result, keep it up.");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const PHYSICAL_SKILLS = ['Soccer', 'Basketball', 'Table Tennis', 'Volleyball', 'Athletics', 'Swimming'];
  const AFFECTIVE_SKILLS = ['Punctuality', 'Neatness', 'Etiquette', 'Leadership', 'Team Communication', 'Emotional Stability'];

  useEffect(() => {
    const fetchReportData = async () => {
      if (!classId) return;
      try {
        const res = await fetch(`/api/broadsheet/class?classId=${classId}`);
        const result = await res.json();
        
        if (result.success) {
          const { students, subjects, classInfo } = result.data;
          
          let highestAvg = 0;
          
          const studentStats = students.map((stu: any) => {
            let totalScore = 0;
            let subjectsTaken = 0;
            const subjectScores: Record<string, any> = {};

            stu.grades.forEach((g: any) => {
              totalScore += (g.total || 0);
              subjectsTaken += 1;
              subjectScores[g.subjectId] = g;
            });

            const average = subjectsTaken > 0 ? (totalScore / subjectsTaken) : 0;
            if (average > highestAvg) highestAvg = average;

            return { ...stu, totalScore, average, subjectsTaken, subjectScores };
          });

          studentStats.sort((a: any, b: any) => b.average - a.average);
          studentStats.forEach((stu: any, index: number) => { stu.position = index + 1; });

          const subjectStats: Record<string, any> = {};
          subjects.forEach((sub: any) => {
            let sum = 0;
            let count = 0;
            const scores: any[] = [];

            studentStats.forEach((stu: any) => {
              const g = stu.subjectScores[sub.id];
              if (g) {
                sum += (g.total || 0);
                count += 1;
                scores.push({ studentId: stu.id, total: g.total || 0 });
              }
            });

            scores.sort((a, b) => b.total - a.total);
            const positions: Record<string, number> = {};
            scores.forEach((s, i) => { positions[s.studentId] = i + 1; });

            subjectStats[sub.id] = { average: count > 0 ? (sum / count) : 0, positions };
          });

          const targetStudent = studentStats.find((s: any) => s.id === studentId);

          setData({ student: targetStudent, classInfo, subjects, subjectStats, totalStudents: students.length });
        }
      } catch (err) {} finally { setLoading(false); }
    };
    fetchReportData();
  }, [studentId, classId]);

  const handleGenerateComment = async () => {
    setIsGeneratingAI(true);
    try {
      const finalGrade = data.student.average >= 75 ? 'A' : data.student.average >= 65 ? 'B' : data.student.average >= 55 ? 'C' : data.student.average >= 45 ? 'D' : 'E';
      const res = await fetch('/api/ai/broadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName: data.student.firstName, totalScore: data.student.totalScore, finalGrade })
      });
      const aiData = await res.json();
      if (aiData.success) {
        setTeacherComment(aiData.data);
      }
    } catch (err) {} finally { setIsGeneratingAI(false); }
  };

  if (loading) return <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center"><Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" /><p className="text-slate-500 font-medium">Generating Official Report Sheet...</p></div>;
  if (!data || !data.student) return <div className="p-20 text-center text-red-600">Failed to load student data.</div>;

  const { student, classInfo, subjects, subjectStats, totalStudents } = data;
  const takenSubjects = subjects.filter((sub: any) => student.subjectScores[sub.id]);

  const getSkillRating = (skillName: string) => {
    if (!student.skillRatings) return 'N/A';
    const record = student.skillRatings.find((s: any) => s.name === skillName);
    return record ? record.rating : 'N/A';
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-container { box-shadow: none !important; border: none !important; margin: 0 !important; max-width: 100% !important; padding: 0 !important; }
          @page { margin: 1cm; }
          input { border: none !important; outline: none !important; background: transparent !important; }
        }
      `}} />
      
      <div className="fixed inset-0 z-[100] bg-slate-100 overflow-y-auto pt-6 pb-20 px-4">
        
        <div className="max-w-5xl mx-auto flex justify-between items-center mb-6 no-print">
          <Link href="/broadsheet" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200"><ArrowLeft className="w-4 h-4" /> Back to Broadsheet</Link>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-[#0033A0] text-white px-6 py-2 rounded-lg hover:bg-[#002277] shadow-sm font-bold"><Printer className="w-4 h-4" /> Print Reportsheet</button>
        </div>

        <div className="max-w-5xl mx-auto bg-white p-8 md:p-12 border border-slate-200 shadow-lg rounded-xl print-container">
          
          <div className="flex flex-col items-center justify-center border-b-2 border-[#0033A0] pb-6 mb-6">
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-3">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center overflow-hidden shrink-0">
                <img src="/logo.jpg" alt="Ditmur Academy Logo" className="w-[85%] h-[85%] object-contain" />
              </div>
              <div className="text-center md:text-left">
                <h1 className="text-3xl font-black text-[#0033A0] tracking-tight uppercase">Ditmur Academy</h1>
                <p className="text-sm font-medium text-slate-700 mt-1">11 Adeshina Close, Off Pipeline, Ishasi Akute Ogun State</p>
                <p className="text-sm font-medium text-slate-700">08038164705</p>
              </div>
            </div>
            <h2 className="text-xl font-bold text-slate-900 uppercase mt-4 text-center">Academic Report Sheet</h2>
            <p className="text-sm font-bold text-slate-600 uppercase text-center">First Term of 2025-2026</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-sm border border-slate-200 p-4 rounded-lg bg-slate-50">
            <div className="space-y-2">
              <p><span className="font-bold text-slate-700 uppercase">Name:</span> <span className="font-bold text-slate-900">{student.firstName} {student.lastName}</span></p>
              <p><span className="font-bold text-slate-700 uppercase">Class:</span> <span className="font-bold text-slate-900">{classInfo?.name}</span></p>
              <p><span className="font-bold text-slate-700 uppercase">Student ID:</span> <span className="font-bold text-slate-900">{student.id}</span></p>
            </div>
            <div className="space-y-2">
              <p><span className="font-bold text-slate-700 uppercase">No of Student in Class:</span> <span className="font-bold text-slate-900">{totalStudents}</span></p>
              <p><span className="font-bold text-slate-700 uppercase">Final Grade:</span> <span className="font-bold text-slate-900">{getRemark(student.average)[0]}</span></p>
              <p><span className="font-bold text-slate-700 uppercase">Percentage:</span> <span className="font-bold text-slate-900">{student.average.toFixed(2)}%</span></p>
            </div>
            <div className="space-y-2">
              <p><span className="font-bold text-slate-700 uppercase">No of Days School Opened:</span> <span className="font-bold text-slate-900">130</span></p>
              <p><span className="font-bold text-slate-700 uppercase">No of Days Present:</span> <span className="font-bold text-slate-900">106</span></p>
              <p><span className="font-bold text-slate-700 uppercase">No of Days Absent:</span> <span className="font-bold text-slate-900">0</span></p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            <div className="flex-[2] overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300">
                    <th className="p-2 border-r border-slate-300 font-bold text-slate-700">Subjects</th>
                    <th className="p-2 border-r border-slate-300 font-bold text-slate-700 text-center w-12">CA 1<br/><span className="font-normal text-[10px]">(20)</span></th>
                    <th className="p-2 border-r border-slate-300 font-bold text-slate-700 text-center w-12">CA 2<br/><span className="font-normal text-[10px]">(20)</span></th>
                    <th className="p-2 border-r border-slate-300 font-bold text-slate-700 text-center w-12">EXAM<br/><span className="font-normal text-[10px]">(60)</span></th>
                    <th className="p-2 border-r border-slate-300 font-bold text-slate-700 text-center">Total</th>
                    <th className="p-2 border-r border-slate-300 font-bold text-slate-700 text-center">Grade</th>
                    <th className="p-2 border-r border-slate-300 font-bold text-slate-700 text-center leading-tight">Class<br/>Average</th>
                    <th className="p-2 border-r border-slate-300 font-bold text-slate-700 text-center">POS</th>
                    <th className="p-2 font-bold text-slate-700">Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {takenSubjects.map((sub: any) => {
                    const grade = student.subjectScores[sub.id];
                    const stats = subjectStats[sub.id];
                    const pos = stats.positions[student.id] || 0;
                    return (
                      <tr key={sub.id}>
                        <td className="p-2 border-r border-slate-300 font-bold text-[#0033A0]">{sub.name}</td>
                        <td className="p-2 border-r border-slate-300 text-center">{grade.ca1}</td>
                        <td className="p-2 border-r border-slate-300 text-center">{grade.ca2}</td>
                        <td className="p-2 border-r border-slate-300 text-center">{grade.exam}</td>
                        <td className="p-2 border-r border-slate-300 text-center font-bold">{grade.total}</td>
                        <td className="p-2 border-r border-slate-300 text-center font-bold text-[#0033A0]">{grade.letter}</td>
                        <td className="p-2 border-r border-slate-300 text-center">{stats.average.toFixed(1)}</td>
                        <td className="p-2 border-r border-slate-300 text-center">{getOrdinalSuffix(pos)}</td>
                        <td className="p-2 font-medium text-slate-600">{getRemark(grade.total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex-[1] flex flex-col gap-6">
              <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300">
                    <th className="p-2 border-r border-slate-300 font-bold text-slate-700 w-2/3">Physical Skills</th>
                    <th className="p-2 font-bold text-slate-700 text-center">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {PHYSICAL_SKILLS.map(skill => (
                    <tr key={skill}><td className="p-2 border-r border-slate-300">{skill}</td><td className="p-2 text-center font-medium">{getSkillRating(skill)}</td></tr>
                  ))}
                </tbody>
              </table>
              <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300">
                    <th className="p-2 border-r border-slate-300 font-bold text-slate-700 w-2/3">Affective Skills</th>
                    <th className="p-2 font-bold text-slate-700 text-center">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {AFFECTIVE_SKILLS.map(skill => (
                    <tr key={skill}><td className="p-2 border-r border-slate-300">{skill}</td><td className="p-2 text-center font-medium">{getSkillRating(skill)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs font-bold text-slate-700 mb-6">
            <div className="space-y-1 border border-slate-200 p-3 rounded bg-slate-50">
              <p>COGNITIVE RATING:</p>
              <p className="font-medium text-slate-600">A = 75-100, B = 65-74, C = 55-64, D = 45-54, E = 40-44, F = 0-39</p>
            </div>
            <div className="space-y-1 border border-slate-200 p-3 rounded bg-slate-50">
              <p>SCALE:</p>
              <div className="font-medium text-slate-600 grid grid-cols-2">
                <span>5 - Very High</span><span>4 - High</span><span>3 - Average</span><span>2 - Below Average</span><span>1 - Low</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 text-sm relative">
            {!isReadOnly && (
              <div className="flex items-center gap-4 no-print mb-2">
                <button onClick={handleGenerateComment} disabled={isGeneratingAI} className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors">
                  {isGeneratingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Sparkles className="w-3.5 h-3.5"/>} Auto-Generate AI Comment
                </button>
              </div>
            )}
            <p className="flex items-center"><span className="font-bold text-slate-800 mr-2 whitespace-nowrap">Class Teacher's Comment:</span> <input disabled={isReadOnly} value={teacherComment} onChange={e => setTeacherComment(e.target.value)} className="italic text-slate-600 border-b border-slate-300 min-w-[300px] outline-none bg-transparent w-full disabled:bg-transparent" /></p>
            <p className="flex items-center"><span className="font-bold text-slate-800 mr-2 whitespace-nowrap">Head Teacher's Comment:</span> <input disabled={isReadOnly} defaultValue="Keep being excellent." className="italic text-slate-600 border-b border-slate-300 min-w-[300px] outline-none bg-transparent w-full disabled:bg-transparent" /></p>
            <p className="mt-6"><span className="font-bold text-slate-800">Resumption Date:</span> 2026-01-04</p>
          </div>

        </div>
      </div>
    </>
  );
}
