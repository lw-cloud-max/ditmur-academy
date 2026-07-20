"use client";

import { useState } from 'react';
import { Search, Save, FileSpreadsheet, Download, Plus } from 'lucide-react';

// Initial mock data with the new ID format!
const initialStudents = [
  { id: 'DIT/STU/001', name: 'Alice Johnson', ca1: 15, ca2: 12, exam: 50 },
  { id: 'DIT/STU/002', name: 'Bob Smith', ca1: 18, ca2: 15, exam: 60 },
  { id: 'DIT/STU/003', name: 'Charlie Brown', ca1: 10, ca2: 14, exam: 45 },
  { id: 'DIT/STU/004', name: 'Diana Prince', ca1: 20, ca2: 18, exam: 58 },
  { id: 'DIT/STU/005', name: 'Evan Wright', ca1: 12, ca2: 10, exam: 40 },
];

export default function BroadsheetPage() {
  const [students, setStudents] = useState(initialStudents);
  const [selectedClass, setSelectedClass] = useState('Grade 10 - Science');
  
  // Dynamic Subjects List
  const [subjects, setSubjects] = useState(['Mathematics', 'English Language', 'Physics', 'Chemistry']);
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]);

  // Helper function to calculate total and grade
  const calculateGrade = (ca1: number, ca2: number, exam: number) => {
    const total = (Number(ca1) || 0) + (Number(ca2) || 0) + (Number(exam) || 0);
    let grade = 'F';
    let color = 'text-red-600 bg-red-100';

    if (total >= 75) { grade = 'A'; color = 'text-emerald-700 bg-emerald-100'; }
    else if (total >= 65) { grade = 'B'; color = 'text-blue-700 bg-blue-100'; }
    else if (total >= 55) { grade = 'C'; color = 'text-yellow-700 bg-yellow-100'; }
    else if (total >= 45) { grade = 'D'; color = 'text-orange-700 bg-orange-100'; }
    else if (total >= 40) { grade = 'E'; color = 'text-amber-700 bg-amber-100'; }

    return { total, grade, color };
  };

  // Handle input changes
  const handleScoreChange = (id: string, field: 'ca1' | 'ca2' | 'exam', value: string) => {
    const numValue = value === '' ? 0 : Math.min(Math.max(parseInt(value, 10), 0), field === 'exam' ? 60 : 20);
    setStudents(students.map(student => 
      student.id === id ? { ...student, [field]: numValue } : student
    ));
  };

  // Function to add a new subject
  const handleAddSubject = () => {
    const newSubject = prompt("Enter the name of the new subject (e.g. Biology, History):");
    if (newSubject && newSubject.trim() !== "") {
      if (!subjects.includes(newSubject)) {
        setSubjects([...subjects, newSubject]);
        setSelectedSubject(newSubject); // Switch to the newly added subject
      } else {
        alert("This subject already exists!");
      }
    }
  };

  const saveGrades = () => {
    alert('Grades saved successfully!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Broadsheet (Grading)</h1>
          <p className="text-slate-500">Manage and input continuous assessments and exam scores.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={saveGrades} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            <Save className="w-4 h-4" /> Save Grades
          </button>
        </div>
      </div>

      {/* Controls & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-xs font-medium text-slate-500 mb-1">Select Class</label>
          <select 
            value={selectedClass} 
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option>Grade 9 - General</option>
            <option>Grade 10 - Science</option>
            <option>Grade 10 - Arts</option>
            <option>Grade 11 - Science</option>
          </select>
        </div>
        
        <div className="flex-1 w-full">
          <label className="block text-xs font-medium text-slate-500 mb-1">Select Subject</label>
          <div className="flex gap-2">
            <select 
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
            <button 
              onClick={handleAddSubject}
              className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors"
              title="Add new subject"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 w-full">
          <label className="block text-xs font-medium text-slate-500 mb-1">Search Student</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name..." 
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Broadsheet Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-4 py-3 text-sm font-semibold">ID</th>
                <th className="px-4 py-3 text-sm font-semibold">Student Name</th>
                <th className="px-4 py-3 text-sm font-semibold w-24">CA 1 (20)</th>
                <th className="px-4 py-3 text-sm font-semibold w-24">CA 2 (20)</th>
                <th className="px-4 py-3 text-sm font-semibold w-24">Exam (60)</th>
                <th className="px-4 py-3 text-sm font-semibold text-center w-24">Total</th>
                <th className="px-4 py-3 text-sm font-semibold text-center w-24">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {students.map((student) => {
                const { total, grade, color } = calculateGrade(student.ca1, student.ca2, student.exam);
                
                return (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-500">{student.id}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{student.name}</td>
                    <td className="px-4 py-3">
                      <input 
                        type="number" 
                        value={student.ca1 || ''} 
                        onChange={(e) => handleScoreChange(student.id, 'ca1', e.target.value)}
                        className="w-full px-2 py-1.5 text-center border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input 
                        type="number" 
                        value={student.ca2 || ''} 
                        onChange={(e) => handleScoreChange(student.id, 'ca2', e.target.value)}
                        className="w-full px-2 py-1.5 text-center border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input 
                        type="number" 
                        value={student.exam || ''} 
                        onChange={(e) => handleScoreChange(student.id, 'exam', e.target.value)}
                        className="w-full px-2 py-1.5 text-center border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-bold text-slate-700">{total}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${color}`}>
                        {grade}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 p-4 border-t border-slate-200 text-sm text-slate-500 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          Showing {students.length} students for {selectedClass} - {selectedSubject}
        </div>
      </div>
    </div>
  );
}
