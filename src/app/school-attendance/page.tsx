"use client";

import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Save, Users, Loader2, CheckCircle2, X } from 'lucide-react';
import Link from 'next/link';

interface AbsenceReason {
  studentId: string;
  studentName: string;
  isExcused: boolean;
  reason: string;
}

export default function AttendancePage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Local state to hold attendance for the UI
  const [attendanceRecord, setAttendanceRecord] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState(false);

  // Absence reason modal state
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [currentAbsentStudent, setCurrentAbsentStudent] = useState<any>(null);
  const [absenceReason, setAbsenceReason] = useState('');
  const [isExcused, setIsExcused] = useState(false);
  const [absenceReasons, setAbsenceReasons] = useState<Record<string, AbsenceReason>>({});

  // Fetch Classes on load
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await fetch('/api/classes');
        const data = await res.json();
        if (data.success) {
          setClasses(data.data);
          if (data.data.length > 0) setSelectedClass(data.data[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch classes");
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  // Fetch Students when Class changes
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClass) {
        setStudents([]);
        return;
      }
      setLoadingStudents(true);
      try {
        const res = await fetch(`/api/students?classId=${selectedClass}`);
        const data = await res.json();
        if (data.success) {
          setStudents(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch students");
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudents();
  }, [selectedClass]);

  // Calendar Helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  const daysInMonth = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const firstDay = getFirstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  // Adjust so Monday is the first day of the grid
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1; 
  const blanks = Array.from({ length: adjustedFirstDay });
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const dateString = selectedDate.toISOString().split('T')[0];

  const handleMarkAttendance = (studentId: string, status: string) => {
    // If marking as absent, show the reason modal
    if (status === 'ABSENT') {
      const student = students.find(s => s.id === studentId);
      setCurrentAbsentStudent(student);
      setAbsenceReason('');
      setIsExcused(false);
      setShowAbsenceModal(true);
      return;
    }

    // If changing from absent to present/late, remove the absence reason
    if (absenceReasons[studentId]) {
      setAbsenceReasons(prev => {
        const newReasons = { ...prev };
        delete newReasons[studentId];
        return newReasons;
      });
    }

    setAttendanceRecord(prev => ({
      ...prev,
      [dateString]: {
        ...prev[dateString],
        [studentId]: status
      }
    }));
  };

  const handleAbsenceSubmit = () => {
    if (!currentAbsentStudent) return;

    // Save the absence reason
    setAbsenceReasons(prev => ({
      ...prev,
      [currentAbsentStudent.id]: {
        studentId: currentAbsentStudent.id,
        studentName: `${currentAbsentStudent.firstName} ${currentAbsentStudent.lastName}`,
        isExcused: isExcused,
        reason: absenceReason
      }
    }));

    // Mark as absent
    setAttendanceRecord(prev => ({
      ...prev,
      [dateString]: {
        ...prev[dateString],
        [currentAbsentStudent.id]: 'ABSENT'
      }
    }));

    setShowAbsenceModal(false);
    setCurrentAbsentStudent(null);
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      // Save attendance records
      const attendanceData = Object.entries(attendanceRecord[dateString] || {}).map(([studentId, status]) => ({
        studentId,
        status,
        date: dateString,
        classId: selectedClass,
        // Include absence reason if available
        absenceReason: absenceReasons[studentId]?.reason || null,
        isExcused: absenceReasons[studentId]?.isExcused || false
      }));

      // Call API to save attendance
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance: attendanceData, date: dateString })
      });

      const data = await res.json();

      if (data.success) {
        // Automatically award behavior points based on attendance
        for (const record of attendanceData) {
          try {
            // Only award demerit for UNEXCUSED absences
            if (record.status === 'ABSENT' && !record.isExcused) {
              await fetch('/api/behavior/auto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  studentId: record.studentId,
                  attendanceStatus: 'ABSENT',
                  date: record.date,
                  term: 'Term 1 - 2024',
                  reason: record.absenceReason
                })
              });
            } else if (record.status === 'LATE') {
              await fetch('/api/behavior/auto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  studentId: record.studentId,
                  attendanceStatus: 'LATE',
                  date: record.date,
                  term: 'Term 1 - 2024'
                })
              });
            } else if (record.status === 'PRESENT') {
              await fetch('/api/behavior/auto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  studentId: record.studentId,
                  attendanceStatus: 'PRESENT',
                  date: record.date,
                  term: 'Term 1 - 2024'
                })
              });
            }
          } catch (err) {
            console.error('Failed to award behavior points:', err);
          }
        }

        alert(`Attendance for ${selectedDate.toDateString()} saved successfully!`);
        // Clear absence reasons after saving
        setAbsenceReasons({});
      } else {
        alert('Failed to save attendance');
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const getStatus = (studentId: string) => {
    return attendanceRecord[dateString]?.[studentId] || 'PRESENT'; // Default to present in UI
  };

  return (
    <div className="space-y-6 pb-32 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance Tracker</h1>
          <p className="text-slate-500">Select a date from the calendar to mark class attendance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CALENDAR MODULE (LEFT SIDE) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <label className="block text-sm font-bold text-slate-700 mb-2">Select Class</label>
            {loading ? (
              <div className="h-10 bg-slate-100 animate-pulse rounded-lg"></div>
            ) : (
              <select 
                value={selectedClass} 
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
              >
                {classes.length === 0 && <option value="">No classes available</option>}
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-slate-900 text-lg">
                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-1">
                <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"><ChevronLeft className="w-5 h-5 text-slate-600" /></button>
                <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"><ChevronRight className="w-5 h-5 text-slate-600" /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                <div key={day} className="text-xs font-bold text-slate-400 py-1">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {blanks.map((_, i) => <div key={`blank-${i}`} className="p-2"></div>)}
              {days.map(day => {
                const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth.getMonth() && selectedDate.getFullYear() === currentMonth.getFullYear();
                const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonth.getMonth() && new Date().getFullYear() === currentMonth.getFullYear();
                
                return (
                  <button 
                    key={day}
                    onClick={() => setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))}
                    className={`p-2 rounded-lg text-sm font-medium transition-all ${
                      isSelected ? 'bg-[#0033A0] text-white shadow-md' : 
                      isToday ? 'bg-blue-50 text-[#0033A0] border border-blue-200' : 
                      'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* REGISTER MODULE (RIGHT SIDE) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[500px]">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[#0033A0]" /> Daily Register
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-1">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            
            <button 
              onClick={handleSaveAttendance}
              disabled={saving || students.length === 0}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white transition-colors ${
                saving || students.length === 0 ? 'bg-blue-400 cursor-not-allowed' : 'bg-[#0033A0] hover:bg-[#002277]'
              }`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Register'}
            </button>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar p-0">
            {loadingStudents ? (
              <div className="h-full flex items-center justify-center min-h-[300px]">
                <Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" />
              </div>
            ) : students.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center min-h-[300px] text-center p-6">
                <Users className="w-12 h-12 text-slate-300 mb-3" />
                <p className="font-bold text-slate-900 text-lg">No students found</p>
                <p className="text-sm text-slate-500 max-w-sm mt-1">There are no students assigned to this class yet. Assign them in the Students Directory.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white shadow-sm z-10">
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-emerald-600 uppercase tracking-wider text-center bg-emerald-50/50">Present</th>
                    <th className="px-6 py-4 text-xs font-bold text-red-600 uppercase tracking-wider text-center bg-red-50/50">Absent</th>
                    <th className="px-6 py-4 text-xs font-bold text-amber-600 uppercase tracking-wider text-center bg-amber-50/50">Late</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student) => {
                    const status = getStatus(student.id);
                    const reason = absenceReasons[student.id];
                    return (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-900">{student.firstName} {student.lastName}</p>
                          <p className="text-xs text-slate-500">{student.id}</p>
                        </td>
                        <td className="px-6 py-4 text-center bg-emerald-50/10">
                          <input 
                            type="radio" 
                            name={`att-${student.id}`} 
                            checked={status === 'PRESENT'}
                            onChange={() => handleMarkAttendance(student.id, 'PRESENT')}
                            className="w-5 h-5 text-emerald-600 focus:ring-emerald-500 cursor-pointer" 
                          />
                        </td>
                        <td className="px-6 py-4 text-center bg-red-50/10">
                          <input 
                            type="radio" 
                            name={`att-${student.id}`} 
                            checked={status === 'ABSENT'}
                            onChange={() => handleMarkAttendance(student.id, 'ABSENT')}
                            className="w-5 h-5 text-red-600 focus:ring-red-500 cursor-pointer" 
                          />
                        </td>
                        <td className="px-6 py-4 text-center bg-amber-50/10">
                          <input 
                            type="radio" 
                            name={`att-${student.id}`} 
                            checked={status === 'LATE'}
                            onChange={() => handleMarkAttendance(student.id, 'LATE')}
                            className="w-5 h-5 text-amber-500 focus:ring-amber-500 cursor-pointer" 
                          />
                        </td>
                        <td className="px-6 py-4">
                          {status === 'ABSENT' && reason ? (
                            <div className="text-xs">
                              <span className={`px-2 py-0.5 rounded-full font-bold ${
                                reason.isExcused ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {reason.isExcused ? 'Excused' : 'Unexcused'}
                              </span>
                              {reason.reason && (
                                <p className="text-slate-500 mt-1 truncate max-w-[150px]">{reason.reason}</p>
                              )}
                            </div>
                          ) : status === 'ABSENT' ? (
                            <span className="text-xs text-slate-400">Click to add reason</span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Absence Reason Modal */}
      {showAbsenceModal && currentAbsentStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animation-fade-in">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Absence Reason</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {currentAbsentStudent.firstName} {currentAbsentStudent.lastName}
                </p>
              </div>
              <button onClick={() => setShowAbsenceModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Is this absence excused?</label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setIsExcused(false)}
                    className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                      !isExcused 
                        ? 'bg-red-500 text-white shadow-md' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    ❌ Unexcused
                  </button>
                  <button
                    onClick={() => setIsExcused(true)}
                    className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                      isExcused 
                        ? 'bg-emerald-500 text-white shadow-md' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    ✅ Excused
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason (Optional)</label>
                <textarea
                  value={absenceReason}
                  onChange={(e) => setAbsenceReason(e.target.value)}
                  rows={3}
                  placeholder="e.g., Sick, Family emergency, Medical appointment..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0] resize-none"
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> Only <span className="font-bold text-red-600">unexcused absences</span> will result in demerit points. 
                  Excused absences will not affect the student's behavior score.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAbsenceModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAbsenceSubmit}
                  className="flex-1 px-4 py-3 bg-[#0033A0] text-white rounded-xl font-bold hover:bg-[#002277] transition-colors"
                >
                  Save Reason
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
