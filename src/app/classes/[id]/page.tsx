"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Search, Plus, Upload, Loader2, Users, BookOpen, Calendar as CalendarIcon, Activity, GraduationCap, Clock, ArrowLeft, Save, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function ClassDetailsPage() {
  const params = useParams();
  const classId = params.id as string;

  const [classInfo, setClassInfo] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('members');

  // Timetable State
  const [timetable, setTimetable] = useState<any[]>([]);
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Skills State
  const [skillsRecord, setSkillsRecord] = useState<any[]>([]);
  const [savingSkills, setSavingSkills] = useState(false);
  const [skillsSaveMessage, setSkillsSaveMessage] = useState('');

  const PHYSICAL_SKILLS = ['Soccer', 'Basketball', 'Table Tennis', 'Volleyball', 'Athletics', 'Swimming'];
  const AFFECTIVE_SKILLS = ['Punctuality', 'Neatness', 'Etiquette', 'Leadership', 'Team Communication', 'Emotional Stability'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [classRes, studentsRes, timetableRes, subjectsRes, skillsRes] = await Promise.all([
          fetch('/api/classes'),
          fetch(`/api/students?classId=${classId}`),
          fetch(`/api/timetable?classId=${classId}`),
          fetch('/api/subjects'),
          fetch(`/api/skills?classId=${classId}`)
        ]);

        const classData = await classRes.json();
        const studentsData = await studentsRes.json();
        const timetableData = await timetableRes.json();
        const subjectsData = await subjectsRes.json();
        const skillsData = await skillsRes.json();

        if (classData.success) {
          const currentClass = classData.data.find((c: any) => c.id === classId);
          setClassInfo(currentClass);
        }
        if (studentsData.success) setStudents(studentsData.data);
        if (timetableData.success) setTimetable(timetableData.data);
        if (subjectsData.success) setSubjects(subjectsData.data);
        if (skillsData.success) setSkillsRecord(skillsData.data);

      } catch (err) {
        console.error("Failed to load class details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [classId]);

  const tabs = [
    { id: 'members', label: 'Members', icon: Users },
    { id: 'subjects', label: 'Subjects', icon: BookOpen },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'skills', label: 'Skills', icon: Activity },
    { id: 'results', label: 'Results', icon: GraduationCap },
    { id: 'timetable', label: 'Timetable', icon: CalendarIcon },
  ];

  const handleSkillChange = (studentId: string, category: string, name: string, rating: string) => {
    const numRating = parseInt(rating, 10);
    const existingIndex = skillsRecord.findIndex(s => s.studentId === studentId && s.name === name);
    
    if (existingIndex >= 0) {
      const updated = [...skillsRecord];
      updated[existingIndex].rating = numRating;
      setSkillsRecord(updated);
    } else {
      setSkillsRecord([...skillsRecord, { studentId, category, name, rating: numRating }]);
    }
    setSkillsSaveMessage('');
  };

  const handleSaveSkills = async () => {
    setSavingSkills(true);
    setSkillsSaveMessage('');
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          term: "Term 1 - 2024",
          ratings: skillsRecord
        })
      });
      const data = await res.json();
      if (data.success) {
        setSkillsSaveMessage("Skill ratings saved securely!");
        setTimeout(() => setSkillsSaveMessage(''), 4000);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Failed to save skills");
    } finally {
      setSavingSkills(false);
    }
  };

  if (loading) {
    return <div className="p-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-[#0033A0]" /></div>;
  }

  return (
    <div className="space-y-6 pb-32">
      <Link href="/classes" className="text-sm font-bold text-[#0033A0] hover:text-blue-800 flex items-center gap-1 mb-2 w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to Classes
      </Link>

      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{classInfo?.name || 'Class Details'}</h1>
            <p className="text-slate-500 mt-1">{classInfo?.level} • Class Teacher: <span className="text-slate-400 italic">{classInfo?.teacher ? `${classInfo.teacher.firstName} ${classInfo.teacher.lastName}` : 'Unassigned'}</span></p>
          </div>
          <div className="flex items-center gap-4 bg-slate-50 px-6 py-3 rounded-xl border border-slate-100">
            <div className="text-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Students</p>
              <p className="text-2xl font-bold text-[#0033A0]">{students.length}</p>
            </div>
          </div>
        </div>

        <div className="flex overflow-x-auto custom-scrollbar gap-2 mt-8 border-b border-slate-200 pb-px">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab.id ? 'border-[#0033A0] text-[#0033A0]' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* MEMBERS TAB */}
      {activeTab === 'members' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animation-fade-in">
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between gap-4 bg-slate-50">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search class members..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium">
                <Upload className="w-4 h-4" /> Bulk Add
              </button>
              <Link href="/admissions" className="flex items-center gap-2 bg-[#0033A0] text-white px-4 py-2 rounded-lg hover:bg-[#002277] transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" /> Add Student
              </Link>
            </div>
          </div>

          {students.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-medium text-slate-900">No students in this class</p>
              <p className="text-sm mt-1">Add a student individually or via bulk upload.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-slate-200">
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student ID</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Gender</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Parent/Guardian</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-[#0033A0]">
                        <Link href={`/students/${encodeURIComponent(student.id)}`} className="hover:underline">{student.id}</Link>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">{student.firstName} {student.lastName}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 capitalize">{student.gender}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-900">{student.parent?.fullName || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">{student.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBJECTS TAB */}
      {activeTab === 'subjects' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animation-fade-in">
          <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <div>
              <h2 className="font-bold text-slate-900">Academic Curriculum</h2>
              <p className="text-sm text-slate-500">Subjects offered by this class.</p>
            </div>
            <Link href="/configuration" className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">
              Manage Curriculum
            </Link>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {subjects.length === 0 ? (
               <div className="col-span-3 text-center text-slate-500 py-8">No subjects configured in the system.</div>
            ) : (
              subjects.map(sub => (
                <div key={sub.id} className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors bg-slate-50/50">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 text-[#0033A0] flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{sub.name}</p>
                    <p className="text-xs text-slate-500">Core Subject</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TIMETABLE TAB */}
      {activeTab === 'timetable' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 animation-fade-in">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Weekly Schedule</h2>
              <p className="text-sm text-slate-500">The current timetable assigned to this class.</p>
            </div>
            <Link href="/timetable" className="text-sm font-bold text-[#0033A0] hover:text-blue-800 bg-blue-50 px-4 py-2 rounded-lg">
              Edit Timetable
            </Link>
          </div>

          {timetable.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-medium text-slate-900">No timetable configured</p>
              <p className="text-sm mt-1 mb-4">You haven't scheduled any classes for this group yet.</p>
              <Link href="/timetable" className="inline-flex items-center gap-2 bg-[#0033A0] text-white px-4 py-2 rounded-lg hover:bg-[#002277] transition-colors text-sm font-medium">
                Create Schedule
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
              {DAYS.map((day) => {
                const dayEntries = timetable
                  .filter(t => t.dayOfWeek === day)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));
                
                return (
                  <div key={day} className="border border-slate-200 rounded-lg overflow-hidden flex flex-col h-full min-h-[300px]">
                    <div className="bg-slate-100 p-2 text-center border-b border-slate-200">
                      <h3 className="font-bold text-slate-700 text-sm">{day}</h3>
                    </div>
                    <div className="p-2 flex-1 space-y-2 bg-slate-50/50">
                      {dayEntries.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium uppercase tracking-wider opacity-50">Free</div>
                      ) : (
                        dayEntries.map(entry => (
                          <div key={entry.id} className="bg-white border border-slate-200 rounded p-2 shadow-sm">
                            <div className="text-xs font-bold text-[#0033A0] mb-1">{entry.startTime} - {entry.endTime}</div>
                            <p className="font-bold text-slate-900 text-xs mb-1">{entry.subject?.name}</p>
                            {entry.teacher && <p className="text-[10px] text-slate-500 truncate">{entry.teacher.firstName} {entry.teacher.lastName}</p>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* RESULTS TAB */}
      {activeTab === 'results' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 animation-fade-in">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Academic Results</h2>
              <p className="text-sm text-slate-500">View performance broadsheets for this class.</p>
            </div>
            <Link href="/broadsheet" className="text-sm font-bold text-[#0033A0] hover:text-blue-800 bg-blue-50 px-4 py-2 rounded-lg flex items-center gap-2">
              <GraduationCap className="w-4 h-4" /> Open Broadsheet
            </Link>
          </div>
          
          <div className="p-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-900">Results are managed centrally</p>
            <p className="text-sm mt-1 mb-4">To view, grade, or export results for this class, please use the main Broadsheet module.</p>
            <Link href="/broadsheet" className="inline-flex items-center gap-2 bg-[#0033A0] text-white px-4 py-2 rounded-lg hover:bg-[#002277] transition-colors text-sm font-medium">
              Go to Broadsheet Module
            </Link>
          </div>
        </div>
      )}

      {/* ATTENDANCE TAB */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 animation-fade-in">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Attendance Register</h2>
              <p className="text-sm text-slate-500">View and manage daily attendance for this class.</p>
            </div>
            <Link href="/attendance" className="text-sm font-bold text-[#0033A0] hover:text-blue-800 bg-blue-50 px-4 py-2 rounded-lg flex items-center gap-2">
              <Clock className="w-4 h-4" /> Open Tracker
            </Link>
          </div>
          
          <div className="p-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-900">Attendance is managed centrally</p>
            <p className="text-sm mt-1 mb-4">To mark students as present, absent, or late, please use the interactive Calendar module.</p>
            <Link href="/attendance" className="inline-flex items-center gap-2 bg-[#0033A0] text-white px-4 py-2 rounded-lg hover:bg-[#002277] transition-colors text-sm font-medium">
              Go to Attendance Calendar
            </Link>
          </div>
        </div>
      )}

      {/* SKILLS TAB */}
      {activeTab === 'skills' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animation-fade-in">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <div>
              <h2 className="font-bold text-slate-900">Psychomotor & Affective Skills</h2>
              <p className="text-sm text-slate-500">Rate students on a scale of 1-5 for report sheets.</p>
            </div>
            <button 
              onClick={handleSaveSkills}
              disabled={savingSkills}
              className="flex items-center gap-2 bg-[#0033A0] text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-[#002277] transition-colors disabled:bg-blue-400"
            >
              {savingSkills ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Ratings
            </button>
          </div>

          {skillsSaveMessage && (
            <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-700 p-3 flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-4 h-4" /> <span className="font-bold">{skillsSaveMessage}</span>
            </div>
          )}

          {students.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-medium text-slate-900">No students available for rating.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0A192F] text-white">
                    <th className="px-4 py-3 text-sm font-semibold min-w-[200px] sticky left-0 bg-[#0A192F] z-10">Student Name</th>
                    {PHYSICAL_SKILLS.map(skill => (
                      <th key={skill} className="px-2 py-3 text-[10px] font-semibold text-center border-l border-slate-700 uppercase tracking-wide text-blue-200">
                        {skill}
                      </th>
                    ))}
                    {AFFECTIVE_SKILLS.map(skill => (
                      <th key={skill} className="px-2 py-3 text-[10px] font-semibold text-center border-l border-slate-700 uppercase tracking-wide text-emerald-200">
                        {skill}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-bold text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-200">
                        {student.firstName} {student.lastName}
                      </td>
                      
                      {PHYSICAL_SKILLS.map(skill => {
                        const rec = skillsRecord.find(s => s.studentId === student.id && s.name === skill);
                        return (
                          <td key={skill} className="px-2 py-2 border-l border-slate-200 bg-blue-50/10">
                            <select 
                              value={rec ? rec.rating : ''}
                              onChange={(e) => handleSkillChange(student.id, 'PHYSICAL', skill, e.target.value)}
                              className="w-full bg-transparent outline-none text-center text-sm font-medium text-blue-900"
                            >
                              <option value="">-</option>
                              <option value="1">1</option>
                              <option value="2">2</option>
                              <option value="3">3</option>
                              <option value="4">4</option>
                              <option value="5">5</option>
                            </select>
                          </td>
                        );
                      })}

                      {AFFECTIVE_SKILLS.map(skill => {
                        const rec = skillsRecord.find(s => s.studentId === student.id && s.name === skill);
                        return (
                          <td key={skill} className="px-2 py-2 border-l border-slate-200 bg-emerald-50/10">
                            <select 
                              value={rec ? rec.rating : ''}
                              onChange={(e) => handleSkillChange(student.id, 'AFFECTIVE', skill, e.target.value)}
                              className="w-full bg-transparent outline-none text-center text-sm font-medium text-emerald-900"
                            >
                              <option value="">-</option>
                              <option value="1">1</option>
                              <option value="2">2</option>
                              <option value="3">3</option>
                              <option value="4">4</option>
                              <option value="5">5</option>
                            </select>
                          </td>
                        );
                      })}

                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs font-medium text-slate-500 flex gap-6">
                <p>1 - Low</p>
                <p>2 - Below Average</p>
                <p>3 - Average</p>
                <p>4 - High</p>
                <p>5 - Very High</p>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
