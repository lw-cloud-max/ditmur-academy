"use client";

import { useState, useEffect } from 'react';
import { Search, Save, Download, Loader2, CheckCircle2, ChevronDown, ArrowRight, TableProperties, PenLine, FileSpreadsheet, X } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

const getOrdinalSuffix = (i: number) => {
  if (!i) return '-';
  const j = i % 10, k = i % 100;
  if (j == 1 && k != 11) return i + "st";
  if (j == 2 && k != 12) return i + "nd";
  if (j == 3 && k != 13) return i + "rd";
  return i + "th";
};

export default function BroadsheetPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isReadOnly = userRole !== 'STAFF' && userRole !== 'ADMIN';

  const [viewMode, setViewMode] = useState<'class' | 'entry'>('class');

  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  // Data for "Class" View
  const [classData, setClassData] = useState<any>(null);
  const [classLoading, setClassLoading] = useState(false);

  // Data for "Entry" View
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Modal State
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Fetch Classes and Subjects
  useEffect(() => {
    const fetchData = async () => {
      try {
        let defaultClassId = null;
        if (userRole === 'STUDENT' && session?.user?.id) {
          const stRes = await fetch(`/api/student-dashboard?studentId=${encodeURIComponent(session.user.id)}`);
          const stData = await stRes.json();
          if (stData.success && stData.data?.student?.classId) {
            defaultClassId = stData.data.student.classId;
          }
        } else if (userRole === 'PARENT' && session?.user?.id) {
          const pRes = await fetch('/api/parents');
          const pData = await pRes.json();
          if (pData.success) {
            const parent = pData.data.find((p: any) => p.id === session.user.id || p.email === session.user.id || p.phone === session.user.id);
            if (parent && parent.students && parent.students.length > 0) {
              defaultClassId = parent.students[0].classId;
            }
          }
        }

        const [classRes, subjectRes] = await Promise.all([
          fetch('/api/classes'),
          fetch('/api/subjects')
        ]);
        const classData = await classRes.json();
        const subjectData = await subjectRes.json();

        if (classData.success) {
          setClasses(classData.data);
          if (defaultClassId) {
            setSelectedClass(defaultClassId);
          } else if (classData.data.length > 0) {
            setSelectedClass(classData.data[0].id);
          }
        }
        if (subjectData.success) {
          setSubjects(subjectData.data);
          if (subjectData.data.length > 0) setSelectedSubject(subjectData.data[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [userRole, session?.user?.id]);

  // Fetch full class broadsheet
  useEffect(() => {
    if (viewMode !== 'class' || !selectedClass) return;
    
    const fetchClassBroadsheet = async () => {
      setClassLoading(true);
      try {
        const res = await fetch(`/api/broadsheet/class?classId=${selectedClass}`);
        const data = await res.json();
        
        if (data.success) {
          const { students: stus, subjects: subs } = data.data;

          // Aggregation Engine
          let classTotalAverage = 0;
          let highestAverage = 0;
          let lowestAverage = 100;

          // Calculate student totals and averages
          const studentStats = stus.map((stu: any) => {
            let totalScore = 0;
            let subjectsTaken = 0;
            const subjectScores: Record<string, any> = {};

            stu.grades.forEach((g: any) => {
              totalScore += (g.total || 0);
              subjectsTaken += 1;
              subjectScores[g.subjectId] = g;
            });

            const average = subjectsTaken > 0 ? (totalScore / subjectsTaken) : 0;
            if (average > highestAverage) highestAverage = average;
            if (average < lowestAverage && subjectsTaken > 0) lowestAverage = average;

            return { ...stu, totalScore, average, subjectsTaken, subjectScores };
          });

          // Sort by average to determine positions
          studentStats.sort((a: any, b: any) => b.average - a.average);
          studentStats.forEach((stu: any, index: number) => {
            stu.position = index + 1;
            classTotalAverage += stu.average;
          });

          const overallClassAverage = studentStats.length > 0 ? (classTotalAverage / studentStats.length) : 0;

          // Subject-level calculations (Averages and Positions per subject)
          const subjectStats: Record<string, any> = {};
          subs.forEach((sub: any) => {
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

            subjectStats[sub.id] = {
              average: count > 0 ? (sum / count) : 0,
              highest: scores.length > 0 ? scores[0].total : 0,
              lowest: scores.length > 0 ? scores[scores.length - 1].total : 0,
              positions
            };
          });

          setClassData({
            students: studentStats,
            subjects: subs,
            overallClassAverage,
            highestAverage,
            lowestAverage: lowestAverage === 100 ? 0 : lowestAverage,
            subjectStats
          });
        }
      } catch (err) {
        console.error("Failed to load class broadsheet");
      } finally {
        setClassLoading(false);
      }
    };
    fetchClassBroadsheet();
  }, [selectedClass, viewMode]);

  // Fetch Data Entry (Single Subject)
  useEffect(() => {
    if (viewMode !== 'entry' || !selectedClass || !selectedSubject) return;
    
    const fetchEntryData = async () => {
      setLoading(true);
      try {
        const [stuRes, gradeRes] = await Promise.all([
          fetch(`/api/students?classId=${selectedClass}`),
          fetch(`/api/grades?classId=${selectedClass}&subjectId=${selectedSubject}`)
        ]);
        const stuData = await stuRes.json();
        const gradeData = await gradeRes.json();

        if (stuData.success) {
          const studentsWithGrades = stuData.data.map((stu: any) => {
            const existingGrade = gradeData.success ? gradeData.data.find((g: any) => g.studentId === stu.id) : null;
            return {
              ...stu,
              ca1: existingGrade?.ca1 || 0,
              ca2: existingGrade?.ca2 || 0,
              exam: existingGrade?.exam || 0
            };
          });
          setStudents(studentsWithGrades);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEntryData();
  }, [selectedClass, selectedSubject, viewMode]);

  // Calculations for Data Entry
  const calculateGrade = (ca1: number, ca2: number, exam: number) => {
    const total = (Number(ca1) || 0) + (Number(ca2) || 0) + (Number(exam) || 0);
    let grade = 'F', color = 'text-red-600 bg-red-100';
    if (total >= 75) { grade = 'A'; color = 'text-emerald-700 bg-emerald-100'; }
    else if (total >= 65) { grade = 'B'; color = 'text-[#0033A0] bg-blue-100'; }
    else if (total >= 55) { grade = 'C'; color = 'text-yellow-700 bg-yellow-100'; }
    else if (total >= 45) { grade = 'D'; color = 'text-orange-700 bg-orange-100'; }
    else if (total >= 40) { grade = 'E'; color = 'text-amber-700 bg-amber-100'; }
    return { total, grade, color };
  };

  const handleScoreChange = (id: string, field: 'ca1' | 'ca2' | 'exam', value: string) => {
    const numValue = value === '' ? 0 : Math.min(Math.max(parseInt(value, 10), 0), field === 'exam' ? 60 : 20);
    setStudents(students.map(student => student.id === id ? { ...student, [field]: numValue } : student));
    setSaveMessage('');
  };

  const saveGrades = async () => {
    if (!selectedClass || !selectedSubject || students.length === 0) return;
    setSaving(true);
    setSaveMessage('');
    try {
      const gradesPayload = students.map(stu => {
        const { total, grade } = calculateGrade(stu.ca1, stu.ca2, stu.exam);
        return { studentId: stu.id, ca1: stu.ca1, ca2: stu.ca2, exam: stu.exam, total, grade };
      });
      const res = await fetch('/api/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId: selectedSubject, classId: selectedClass, grades: gradesPayload })
      });
      const data = await res.json();
      if (data.success) setSaveMessage('Grades saved securely to the database!');
    } catch (err) {
      alert("Failed to connect to the server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-32">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Broadsheet & Reports</h1>
          <p className="text-slate-500">View aggregate class sheets or enter subject grades.</p>
        </div>
        
        {/* Toggle View */}
        <div className="flex bg-slate-200 p-1 rounded-lg">
          <button 
            onClick={() => setViewMode('class')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
              viewMode === 'class' ? 'bg-white text-[#0033A0] shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <TableProperties className="w-4 h-4" /> Class Arm Broadsheet
          </button>
          {!isReadOnly && (
            <button 
              onClick={() => setViewMode('entry')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
                viewMode === 'entry' ? 'bg-white text-[#0033A0] shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <PenLine className="w-4 h-4" /> Subject Grading (Entry)
            </button>
          )}
        </div>
      </div>

      {isReadOnly && userRole === 'STUDENT' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
          <p className="text-sm font-bold text-[#0033A0]">Note: You are viewing records for your assigned class.</p>
        </div>
      )}

      {/* Shared Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-end">
        {(!isReadOnly || userRole === 'PARENT') && (
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-slate-500 mb-1">Select Class Level</label>
            <select 
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
            >
              {classes.length === 0 && <option value="">No classes configured...</option>}
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        
        {viewMode === 'entry' && (
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-slate-500 mb-1">Select Subject</label>
            <select 
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
            >
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        <div className="flex-1 w-full">
          <label className="block text-xs font-medium text-slate-500 mb-1">Term and Session</label>
          <select className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700">
            <option>First Term 2024-2025</option>
            <option>Second Term 2024-2025</option>
          </select>
        </div>
      </div>

      {/* --- CLASS BROADSHEET VIEW --- */}
      {viewMode === 'class' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {classLoading || !classData ? (
            <div className="p-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" /></div>
          ) : classData.students.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <TableProperties className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-medium text-slate-900">No students in this class.</p>
            </div>
          ) : (
            <>
              {/* Analytics Bar */}
              <div className="p-4 border-b border-slate-200 bg-blue-50/30 flex flex-wrap gap-6 text-sm">
                <p className="text-slate-600 font-medium">No. of students: <span className="font-bold text-[#0033A0]">{classData.students.length}</span></p>
                <p className="text-slate-600 font-medium">Class Average: <span className="font-bold text-[#0033A0]">{classData.overallClassAverage.toFixed(2)}</span></p>
                <p className="text-slate-600 font-medium">Highest Average in Class: <span className="font-bold text-[#0033A0]">{classData.highestAverage.toFixed(2)}</span></p>
                <p className="text-slate-600 font-medium">Lowest Average in Class: <span className="font-bold text-[#0033A0]">{classData.lowestAverage.toFixed(2)}</span></p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 min-w-[250px]">Students</th>
                      {classData.subjects.map((sub: any) => (
                        <th key={sub.id} className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center border-l border-slate-200">
                          {sub.name.substring(0, 3)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classData.students.filter((stu: any) => {
                      if (userRole === 'STUDENT') return stu.id === session?.user?.id;
                      if (userRole === 'PARENT') return stu.parent?.email === session?.user?.id || stu.parentId === session?.user?.id || stu.parent?.phone === session?.user?.id;
                      return true;
                    }).map((stu: any) => (
                      <tr 
                        key={stu.id} 
                        className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                        onClick={() => setSelectedStudent(stu)}
                      >
                        <td className="px-6 py-3 sticky left-0 bg-white group-hover:bg-blue-50/50 z-10">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0033A0] flex items-center justify-center font-bold text-xs">
                              {stu.firstName[0]}{stu.lastName[0]}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 group-hover:text-[#0033A0]">{stu.firstName} {stu.lastName}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{stu.id}</p>
                            </div>
                          </div>
                        </td>
                        {classData.subjects.map((sub: any) => {
                          const score = stu.subjectScores[sub.id]?.total;
                          return (
                            <td key={sub.id} className="px-4 py-3 text-center border-l border-slate-100 text-sm font-medium text-slate-700">
                              {score !== undefined ? score : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* --- DATA ENTRY VIEW --- */}
      {viewMode === 'entry' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-end bg-slate-50">
            <button onClick={saveGrades} disabled={saving || students.length === 0} className={`flex items-center gap-2 text-white px-5 py-2 rounded-lg text-sm font-bold ${saving || students.length === 0 ? 'bg-blue-400' : 'bg-[#0033A0] hover:bg-[#002277]'}`}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Subject Grades
            </button>
          </div>

          {saveMessage && (
            <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-700 p-3 flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-4 h-4" /> <span className="font-bold">{saveMessage}</span>
            </div>
          )}

          {loading ? (
            <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0A192F] text-white">
                    <th className="px-4 py-3 text-sm font-semibold">Student Name</th>
                    <th className="px-4 py-3 text-sm font-semibold w-24">CA 1 (20)</th>
                    <th className="px-4 py-3 text-sm font-semibold w-24">CA 2 (20)</th>
                    <th className="px-4 py-3 text-sm font-semibold w-24">Exam (60)</th>
                    <th className="px-4 py-3 text-sm font-semibold text-center w-24">Total</th>
                    <th className="px-4 py-3 text-sm font-semibold text-center w-24">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {students.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-medium">No students found.</td></tr>
                  ) : (
                    students.map((student) => {
                      const { total, grade, color } = calculateGrade(student.ca1, student.ca2, student.exam);
                      return (
                        <tr key={student.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm font-bold text-slate-900">{student.firstName} {student.lastName}</td>
                          <td className="px-4 py-3"><input type="number" value={student.ca1 || ''} onChange={(e) => handleScoreChange(student.id, 'ca1', e.target.value)} className="w-full px-2 py-1.5 text-center border rounded outline-none" /></td>
                          <td className="px-4 py-3"><input type="number" value={student.ca2 || ''} onChange={(e) => handleScoreChange(student.id, 'ca2', e.target.value)} className="w-full px-2 py-1.5 text-center border rounded outline-none" /></td>
                          <td className="px-4 py-3"><input type="number" value={student.exam || ''} onChange={(e) => handleScoreChange(student.id, 'exam', e.target.value)} className="w-full px-2 py-1.5 text-center border rounded outline-none" /></td>
                          <td className="px-4 py-3 text-center font-bold text-slate-700">{total}</td>
                          <td className="px-4 py-3 text-center"><span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${color}`}>{grade}</span></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* STUDENT PERFORMANCE MODAL (Matches Screenshot 2) */}
      {selectedStudent && classData && (
        <div className="fixed inset-0 bg-[#0A192F]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animation-fade-in flex flex-col max-h-[90vh]">
            
            {/* Header Block */}
            <div className="bg-[#0033A0] text-white p-6 relative">
              <button onClick={() => setSelectedStudent(null)} className="absolute top-4 right-4 p-1 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white text-[#0033A0] flex items-center justify-center font-black text-2xl shadow-lg">
                    {selectedStudent.firstName[0]}{selectedStudent.lastName[0]}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-200 uppercase tracking-wider mb-1">{selectedStudent.id}</p>
                    <h2 className="text-2xl font-bold">{selectedStudent.firstName} {selectedStudent.lastName}</h2>
                    <p className="text-blue-100 text-sm mt-1">{classes.find(c => c.id === selectedClass)?.name}</p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-3">
                  <div className="flex items-center gap-1.5 bg-emerald-500/20 px-3 py-1 rounded-full text-emerald-100 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                  </div>
                  <Link 
                    href={`/reportsheet/${encodeURIComponent(selectedStudent.id)}?classId=${selectedClass}`}
                    className="bg-white text-[#0033A0] hover:bg-blue-50 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm"
                  >
                    View Reportsheet
                  </Link>
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mt-8">
                <div>
                  <p className="text-xs font-bold text-blue-200 mb-1">Position</p>
                  <p className="text-xl font-bold">{selectedStudent.position} <span className="text-sm font-normal text-blue-200">/ {classData.students.length}</span></p>
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-200 mb-1">Final Grade</p>
                  <p className="text-xl font-bold">
                    {selectedStudent.average >= 75 ? 'A' : selectedStudent.average >= 65 ? 'B' : selectedStudent.average >= 55 ? 'C' : 'D'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-200 mb-1">Total Score</p>
                  <p className="text-xl font-bold">{selectedStudent.totalScore}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-200 mb-1">Final Average</p>
                  <p className="text-xl font-bold">{selectedStudent.average.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-200 mb-1">No. of Subjects</p>
                  <p className="text-xl font-bold">{selectedStudent.subjectsTaken}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-200 mb-1">Class Average</p>
                  <p className="text-xl font-bold">{classData.overallClassAverage.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-200 mb-1">High/Low Avg</p>
                  <p className="text-sm font-bold">{classData.highestAverage.toFixed(2)} / {classData.lowestAverage.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Detailed Table */}
            <div className="p-0 overflow-y-auto flex-1 bg-slate-50">
              <div className="p-4 bg-slate-100 border-b border-slate-200 font-bold text-slate-500 text-xs tracking-wider uppercase">Assessments</div>
              <table className="w-full text-left border-collapse">
                <thead className="bg-white border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Subjects</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-center">CA 1</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-center">CA 2</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-center">EXAM</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-900 uppercase text-center">TOTAL</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-center">Grade</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-center">Position</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-center">Out of</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase text-right">Class average</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {classData.subjects.map((sub: any) => {
                    const grade = selectedStudent.subjectScores[sub.id];
                    if (!grade) return null; // Only show subjects they took
                    
                    const subStats = classData.subjectStats[sub.id];
                    const pos = subStats.positions[selectedStudent.id];
                    
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 font-bold text-slate-700 text-sm">{sub.name}</td>
                        <td className="px-4 py-3 text-center text-slate-600 text-sm">{grade.ca1}/20</td>
                        <td className="px-4 py-3 text-center text-slate-600 text-sm">{grade.ca2}/20</td>
                        <td className="px-4 py-3 text-center text-slate-600 text-sm">{grade.exam}/60</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-900">{grade.total}</td>
                        <td className="px-4 py-3 text-center font-bold text-[#0033A0]">{grade.letter}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700">{getOrdinalSuffix(pos)}</td>
                        <td className="px-4 py-3 text-center text-slate-500 text-sm">{Object.keys(subStats.positions).length}</td>
                        <td className="px-6 py-3 text-right text-slate-600 text-sm font-medium">{subStats.average.toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
