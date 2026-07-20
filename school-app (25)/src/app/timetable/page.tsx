"use client";

import { useState, useEffect } from 'react';
import { Calendar, Plus, Clock, Loader2, Trash2, MapPin, User, BookOpen } from 'lucide-react';
import { useSession } from 'next-auth/react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function TimetablePage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isReadOnly = userRole !== 'STAFF' && userRole !== 'ADMIN';

  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  
  const [selectedClass, setSelectedClass] = useState('');
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    dayOfWeek: 'Monday',
    startTime: '08:00',
    endTime: '09:00',
    subjectId: '',
    teacherId: '',
    room: ''
  });

  // Fetch dropdown data on load
  useEffect(() => {
    const fetchCoreData = async () => {
      try {
        let defaultClassId = null;

        if (userRole === 'STUDENT' && session?.user?.id) {
          const stRes = await fetch(`/api/student-dashboard?studentId=${encodeURIComponent(session.user.id)}`);
          const stData = await stRes.json();
          if (stData.success && stData.data?.student?.classId) {
            defaultClassId = stData.data.student.classId;
          }
        } else if (userRole === 'PARENT' && session?.user?.id) {
          // Fetch parent data and get the class of their first child
          const pRes = await fetch('/api/parents');
          const pData = await pRes.json();
          if (pData.success) {
            const parent = pData.data.find((p: any) => p.id === session.user.id || p.email === session.user.id || p.phone === session.user.id);
            if (parent && parent.students && parent.students.length > 0) {
              defaultClassId = parent.students[0].classId;
            }
          }
        }

        const [cRes, sRes, tRes] = await Promise.all([
          fetch('/api/classes'),
          fetch('/api/subjects'),
          fetch('/api/staff')
        ]);
        const cData = await cRes.json();
        const sData = await sRes.json();
        const tData = await tRes.json();

        if (cData.success) {
          setClasses(cData.data);
          if (defaultClassId) {
            setSelectedClass(defaultClassId);
          } else if (cData.data.length > 0) {
            setSelectedClass(cData.data[0].id);
          }
        }
        if (sData.success) setSubjects(sData.data);
        if (tData.success) setTeachers(tData.data.filter((t: any) => t.role === 'TEACHER'));
      } catch (err) {
        console.error("Failed to load core data");
      }
    };
    fetchCoreData();
  }, [userRole, session?.user?.id]);

  // Fetch timetable when class changes
  const fetchTimetable = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/timetable?classId=${selectedClass}`);
      const data = await res.json();
      if (data.success) {
        setTimetable(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch timetable");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, [selectedClass]);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, classId: selectedClass })
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchTimetable();
        // Reset time but keep day for quick entry
        setFormData({ ...formData, startTime: '', endTime: '', subjectId: '', room: '' });
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Failed to add entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm("Delete this block from the timetable?")) return;
    try {
      await fetch(`/api/timetable?id=${id}`, { method: 'DELETE' });
      setTimetable(timetable.filter(t => t.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to get entries for a specific day and sort by time
  const getEntriesForDay = (day: string) => {
    return timetable
      .filter(t => t.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  return (
    <div className="space-y-6 pb-32">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Class Timetable</h1>
          <p className="text-slate-500">{isReadOnly ? "View your child's weekly class schedule and subjects." : "Schedule subjects, teachers, and rooms for the week."}</p>
        </div>
      {!isReadOnly && (
        <button 
          onClick={() => setIsModalOpen(true)}
            disabled={!selectedClass}
            className="flex items-center gap-2 bg-[#0033A0] text-white px-4 py-2 rounded-lg hover:bg-[#002277] transition-colors font-medium text-sm disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" /> Add Time Block
          </button>
        )}
      </div>

      {isReadOnly && userRole === 'STUDENT' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
          <p className="text-sm font-bold text-[#0033A0]">Note: You are viewing the timetable for your assigned class.</p>
        </div>
      )}

      {(!isReadOnly || userRole === 'PARENT') && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <label className="text-sm font-bold text-slate-700 whitespace-nowrap">Viewing Schedule For:</label>
          <select 
            value={selectedClass} 
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full sm:w-64 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
          >
            {classes.length === 0 && <option value="">No classes available...</option>}
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-24 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {DAYS.map((day) => {
            const dayEntries = getEntriesForDay(day);
            
            return (
              <div key={day} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
                <div className="bg-[#0A192F] text-white p-3 text-center border-b border-slate-800">
                  <h3 className="font-bold tracking-wide">{day}</h3>
                </div>
                
                <div className="p-3 flex-1 bg-slate-50/50 space-y-3">
                  {dayEntries.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                      <Calendar className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-xs font-medium uppercase tracking-wider">Free Day</p>
                    </div>
                  ) : (
                    dayEntries.map(entry => (
                      <div key={entry.id} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm relative group hover:border-blue-300 transition-colors">
                        
                        {!isReadOnly && (
                          <button 
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="absolute top-2 right-2 p-1.5 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 rounded-md opacity-100 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#0033A0] mb-2 bg-blue-50 w-fit px-2 py-1 rounded">
                          <Clock className="w-3.5 h-3.5" /> {entry.startTime} - {entry.endTime}
                        </div>
                        
                        <p className="font-bold text-slate-900 text-sm mb-2">{entry.subject?.name}</p>
                        
                        <div className="space-y-1.5">
                          {entry.teacher && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate">{entry.teacher.firstName} {entry.teacher.lastName}</span>
                            </div>
                          )}
                          {entry.room && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate">{entry.room}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD TIME BLOCK MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#0A192F]/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animation-fade-in">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Add Time Block</h3>
              <p className="text-sm text-slate-500 mt-1">Schedule a class session to the timetable.</p>
            </div>
            
            <form onSubmit={handleAddEntry} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Day of Week</label>
                  <select 
                    required value={formData.dayOfWeek} onChange={e => setFormData({...formData, dayOfWeek: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 font-medium"
                  >
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                  <input 
                    type="time" required value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                  <input 
                    type="time" required value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <select 
                  required value={formData.subjectId} onChange={e => setFormData({...formData, subjectId: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                >
                  <option value="">Select subject...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Teacher (Optional)</label>
                <select 
                  value={formData.teacherId} onChange={e => setFormData({...formData, teacherId: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                >
                  <option value="">Select teacher...</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Room / Location (Optional)</label>
                <input 
                  type="text" value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} placeholder="e.g. Science Lab B"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500" 
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-[#0033A0] hover:bg-[#002277] text-white rounded-lg font-medium text-sm transition-colors flex justify-center items-center gap-2">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Block'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
