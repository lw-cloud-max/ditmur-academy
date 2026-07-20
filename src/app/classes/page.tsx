"use client";

import { useState, useEffect } from 'react';
import { Search, Filter, MoreVertical, Eye, UserPlus, School, Loader2, Users } from 'lucide-react';
import Link from 'next/link';

export default function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // Assign Teacher Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [classToAssign, setClassToAssign] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [classRes, staffRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/staff')
      ]);
      const classData = await classRes.json();
      const staffData = await staffRes.json();
      
      if (classData.success) setClasses(classData.data);
      if (staffData.success) {
        // Filter to only show teachers in the dropdown
        setStaff(staffData.data.filter((s: any) => s.role === 'TEACHER'));
      }
    } catch (err) {
      console.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const openAssignModal = (classId: string) => {
    setClassToAssign(classId);
    setSelectedTeacherId('');
    setIsAssignModalOpen(true);
    setActiveDropdown(null);
  };

  const handleAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classToAssign || !selectedTeacherId) return;
    
    setAssigning(true);
    try {
      const res = await fetch('/api/classes/assign-teacher', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: classToAssign, teacherId: selectedTeacherId })
      });
      const data = await res.json();
      
      if (data.success) {
        setIsAssignModalOpen(false);
        fetchData(); // Refresh the list
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Failed to assign teacher");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6 pb-32">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Classes</h1>
          <p className="text-slate-500">Manage school classes and assign Form Teachers.</p>
        </div>
        <Link href="/configuration" className="flex items-center gap-2 bg-[#0A192F] text-white px-4 py-2 rounded-lg hover:bg-[#060F1D] transition-colors text-sm font-medium">
          <School className="w-4 h-4" /> Configure Classes
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search classes..." 
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-visible">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" /></div>
        ) : (
          <div className="overflow-visible">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Class Name</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Academic Level</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Form Teacher</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Students</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {classes.map((c) => {
                  const teacher = staff.find(s => s.id === c.teacherId);
                  
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{c.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{c.level}</td>
                      <td className="px-6 py-4 text-sm">
                        {teacher ? (
                          <span className="font-bold text-slate-900">{teacher.firstName} {teacher.lastName}</span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#0033A0]">
                          <Users className="w-3 h-3" /> {c._count?.students || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right relative">
                        <button 
                          onClick={() => setActiveDropdown(activeDropdown === c.id ? null : c.id)}
                          className="p-2 text-slate-400 hover:text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>

                        {activeDropdown === c.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)}></div>
                            <div className="absolute right-8 top-12 w-48 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-2 text-left animate-in fade-in slide-in-from-top-2">
                              <Link href={`/classes/${c.id}`} className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                                <Eye className="w-4 h-4 text-slate-400" /> View Class
                              </Link>
                              <div className="h-px bg-slate-100 my-1"></div>
                              <button onClick={() => openAssignModal(c.id)} className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                                <UserPlus className="w-4 h-4 text-slate-400" /> Assign Teacher
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ASSIGN TEACHER MODAL */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-[#0A192F]/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Assign Form Teacher</h3>
              <p className="text-sm text-slate-500 mt-1">Select a staff member to manage this class.</p>
            </div>
            <form onSubmit={handleAssignTeacher} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Teacher</label>
                <select 
                  required
                  value={selectedTeacherId} 
                  onChange={e => setSelectedTeacherId(e.target.value)} 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
                >
                  <option value="">Choose a teacher...</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                  ))}
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsAssignModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-colors">Cancel</button>
                <button type="submit" disabled={assigning} className="flex-1 px-4 py-2 bg-[#0033A0] hover:bg-[#002277] text-white rounded-lg font-medium text-sm transition-colors flex justify-center items-center gap-2">
                  {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
