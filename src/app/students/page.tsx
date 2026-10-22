"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import TemporaryPasswordNotice, { type IssuedCredential } from '@/components/TemporaryPasswordNotice';
import { 
  Search, Plus, Filter, MoreVertical, GraduationCap, Loader2, Trash2,
  Eye, Edit, BookOpen, Link as LinkIcon, KeyRound, Mail, MessageSquare, X, ArrowRight
} from 'lucide-react';
import Link from 'next/link';

type ExistingParentOption = {
  id: string; fullName: string; email: string | null; phone: string;
  students: { id: string; firstName: string; lastName: string; class: { name: string } | null }[];
};
async function readApiResponse(response: Response): Promise<Record<string, unknown>> {
  const raw = await response.text();
  try {
    const value: unknown = JSON.parse(raw);
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  } catch { /* return a clear message below instead of a browser JSON exception */ }
  throw new Error(`The server returned an unexpected response (${response.status}). Please refresh and retry.`);
}

export default function StudentsPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isReadOnly = userRole !== 'STAFF' && userRole !== 'ADMIN';
  const isSuperAdmin = userRole === 'ADMIN' && session?.user?.id === 'admin-1';
  const [credential, setCredential] = useState<IssuedCredential | null>(null);

  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // Modals state
  const [modalType, setModalType] = useState<'edit' | 'class' | 'parent' | 'message' | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', dob: '', gender: '', status: '' });
  const [classForm, setClassForm] = useState({ classId: '' });
  const [parentSearch, setParentSearch] = useState('');
  const [parentOptions, setParentOptions] = useState<ExistingParentOption[]>([]);
  const [selectedParentId, setSelectedParentId] = useState('');
  const [parentSearchLoading, setParentSearchLoading] = useState(false);
  const [parentSearchError, setParentSearchError] = useState('');
  const parentSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const parentSearchAbort = useRef<AbortController | null>(null);
  const [messageForm, setMessageForm] = useState({ message: '', subject: 'Message from School' });
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stuRes, classRes] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/classes')
      ]);
      const stuData = await stuRes.json();
      const classData = await classRes.json();
      
      if (stuData.success) {
        if (userRole === 'PARENT' && session?.user?.id) {
          // session.user.id holds the email they typed to log in
          setStudents(stuData.data.filter((s: any) => s.parent?.email === session.user.id || s.parent?.phone === session.user.id || s.parentId === session.user.id));
        } else {
          setStudents(stuData.data);
        }
      }
      if (classData.success) setClasses(classData.data);
    } catch (err) {
      console.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userRole, session?.user?.id]);

  const handleMarkInactive = async (id: string, name: string) => {
    if (!window.confirm(`Mark ${name} as inactive because they have left the school? Their grades, invoices and other records will be kept, and Student login will stop.`)) return;
    try {
      const res = await fetch('/api/students/status', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'MARK_INACTIVE', confirmed: true })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not update Student status');
      setStudents(current => current.filter(student => student.id !== id));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not mark Student inactive');
    }
  };

  const openModal = (student: any, type: 'edit' | 'class' | 'parent' | 'message') => {
    setSelectedStudent(student);
    setActiveDropdown(null);
    setModalType(type);

    if (type === 'edit') {
      setEditForm({
        firstName: student.firstName,
        lastName: student.lastName,
        dob: new Date(student.dob).toISOString().split('T')[0],
        gender: student.gender,
        status: student.status
      });
    } else if (type === 'class') {
      setClassForm({ classId: student.classId || '' });
    } else if (type === 'parent') {
      if (parentSearchTimer.current) clearTimeout(parentSearchTimer.current);
      parentSearchAbort.current?.abort();
      setParentSearch(''); setParentOptions([]); setSelectedParentId('');
      setParentSearchLoading(false); setParentSearchError('');
    } else if (type === 'message') {
      setMessageForm({ message: '', subject: 'Message from School Admin' });
    }
  };

  const searchExistingParents = (studentId: string, value: string) => {
    if (parentSearchTimer.current) clearTimeout(parentSearchTimer.current);
    parentSearchAbort.current?.abort();
    setParentSearchError('');
    const query = value.trim();
    if (query.length < 2) {
      setParentOptions([]); setParentSearchLoading(false);
      if (query.length) setParentSearchError('Enter at least two characters to search existing Parent records.');
      return;
    }
    setParentSearchLoading(true);
    parentSearchTimer.current = setTimeout(async () => {
      const controller = new AbortController(); parentSearchAbort.current = controller;
      try {
        const params = new URLSearchParams({ studentId, search: query });
        const response = await fetch(`/api/students/parent-options?${params}`, { cache: 'no-store', signal: controller.signal });
        const data = await readApiResponse(response);
        if (!response.ok || data.success !== true) throw new Error(typeof data.error === 'string' ? data.error : `Search failed (${response.status})`);
        const options = Array.isArray(data.data) ? data.data as ExistingParentOption[] : [];
        setParentOptions(options);
        setParentSearchError(options.length ? '' : 'No existing Parent record matched. Ask the super admin to verify or create the guardian record first.');
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        setParentOptions([]);
        setParentSearchError(error instanceof Error ? error.message : 'Could not search Parent records.');
      } finally { if (!controller.signal.aborted) setParentSearchLoading(false); }
    }, 250);
  };

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setIsSubmitting(true);
    try {
      if (modalType === 'message') {
        const response = await fetch('/api/messaging', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audience: 'specific_student', type: 'email', subject: messageForm.subject,
            message: `Dear ${selectedStudent.parent?.fullName || 'Parent/Guardian'},\n\n${messageForm.message}` })
        });
        const result = await readApiResponse(response);
        if (!response.ok || result.success !== true) throw new Error(typeof result.error === 'string' ? result.error : 'Message was not sent');
        alert(typeof result.message === 'string' ? result.message : 'Message request accepted.');
      } else {
        let payload: Record<string, unknown> = { id: selectedStudent.id };
        if (modalType === 'edit') {
          if (!isSuperAdmin) throw new Error('Super admin required to edit student records.');
          payload = { ...payload, action: 'update_student', firstName: editForm.firstName,
            lastName: editForm.lastName, dob: editForm.dob, gender: editForm.gender };
        } else if (modalType === 'class') {
          if (!isSuperAdmin) throw new Error('Only the super admin can move a student to another class.');
          if (!classForm.classId) throw new Error('Select the correct class first.');
          if (classForm.classId === selectedStudent.classId) throw new Error('Student is already in that class.');
          if (!window.confirm(`Move ${selectedStudent.firstName} ${selectedStudent.lastName} to the selected class? Existing Parent links and records stay attached. Historical class reports may be affected.`)) return;
          payload = { ...payload, action: 'assign_class', classId: classForm.classId,
            expectedClassId: selectedStudent.classId || null, confirmed: true };
        } else if (modalType === 'parent') {
          if (!selectedParentId) throw new Error('Search for and select an existing Parent account.');
          const choice = parentOptions.find(parent => parent.id === selectedParentId);
          if (!choice) throw new Error('Search again and select a current Parent record.');
          const from = selectedStudent.parent?.fullName || 'no Parent linked';
          if (!window.confirm(`Link ${selectedStudent.firstName} ${selectedStudent.lastName} to ${choice.fullName} (${choice.phone})? Current link: ${from}. This selects an existing Parent account; it does not create one.`)) return;
          payload = { ...payload, action: 'link_parent', parentId: selectedParentId,
            expectedParentId: selectedStudent.parentId || null, confirmed: true };
        } else {
          throw new Error('Choose a supported student action.');
        }

        const sendUpdate = async (dataToSend: Record<string, unknown>) => {
          const response = await fetch('/api/students', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataToSend) });
          return { response, data: await readApiResponse(response) };
        };
        let result = await sendUpdate(payload);
        if (modalType === 'class' && result.data.needsHistoryConfirmation === true && result.data.historyCounts && typeof result.data.historyCounts === 'object') {
          const counts = result.data.historyCounts as Record<string, unknown>;
          const summary = Object.entries(counts).filter(([, count]) => typeof count === 'number' && count > 0)
            .map(([label, count]) => `${label}: ${count}`).join('\n');
          const proceed = window.confirm(`This student has existing records:\n${summary}\n\nThe records are retained, but historical class reports may be affected by changing the current class. Confirm the placement change?`);
          if (!proceed) return;
          result = await sendUpdate({ ...payload, historyConfirmed: true });
        }
        if (!result.response.ok || result.data.success !== true) {
          throw new Error(typeof result.data.error === 'string' ? result.data.error : `Update failed (${result.response.status})`);
        }
        await fetchData();
      }
      setModalType(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to complete action');
    } finally { setIsSubmitting(false); }
  };

  const resetStudentPassword = async (id: string) => {
    setActiveDropdown(null); setCredential(null);
    if (!confirm('Reset student login? The old password will stop working.')) return;
    try {
      const res = await fetch('/api/credentials/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'STUDENT', id }) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Reset failed');
      setCredential(data.data);
    } catch (error) { alert(error instanceof Error ? error.message : 'Reset failed'); }
  };

  // Filter students based on search query and class filter
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      searchQuery === '' ||
      student.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.parent?.fullName || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesClass = filterClass === '' || student.classId === filterClass;
    
    return matchesSearch && matchesClass;
  });

  if (userRole === 'PARENT') {
    return (
      <div className="space-y-6 pb-32">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Children</h1>
            <p className="text-slate-500">View academic records and details for your linked wards.</p>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" />
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No children linked</h3>
            <p className="text-slate-500 text-sm">There are currently no students connected to your parent account.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {students.map((stu: any) => (
              <div key={stu.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-blue-100 text-[#0033A0] flex items-center justify-center font-bold text-xl flex-shrink-0">
                    {stu.firstName[0]}{stu.lastName[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{stu.firstName} {stu.lastName}</h3>
                    <p className="text-sm font-medium text-slate-500">{stu.id} • {stu.class?.name || 'Unassigned'}</p>
                  </div>
                </div>
                <div className="p-6 space-y-4 flex-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">Status</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${stu.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{stu.status}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">Date of Birth</span>
                    <span className="font-bold text-slate-900">{new Date(stu.dob).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100">
                  <Link 
                    href={`/reportsheet/${encodeURIComponent(stu.id)}?classId=${stu.classId}`}
                    className="w-full py-2.5 bg-[#0033A0] hover:bg-[#002277] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    View Academic Results <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32 relative">
      <TemporaryPasswordNotice credential={credential} onClose={() => setCredential(null)} />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Students Directory</h1>
          <p className="text-slate-500">Manage student records and information.</p>
        </div>
        {isSuperAdmin && <Link href="/students/preserve-id" className="flex min-h-11 items-center gap-2 rounded-lg border border-blue-700 bg-white px-4 text-sm font-bold text-blue-800 hover:bg-blue-50">Add missing Student - keep ID</Link>}
        {!isReadOnly && (
          <Link href="/admissions" className="flex items-center gap-2 bg-[#0033A0] text-white px-4 py-2 rounded-lg hover:bg-[#002277] transition-colors">
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add New Student</span>
          </Link>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search students by name, ID, or parent..." 
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none transition-all" 
          />
        </div>
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
        >
          <option value="">All Classes</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filters</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" />
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No students found</h3>
          <p className="text-slate-500 text-sm mb-4">
            {searchQuery || filterClass ? 'Try adjusting your search or filters.' : "You haven't admitted any students into the system yet."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-visible">
          <div className="overflow-visible">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Student ID</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Name</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Class</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Parent / Guardian</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredStudents.map((student) => {
                  const encodedId = encodeURIComponent(student.id);

                  return (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-[#0033A0]">{student.id}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900">
                          {student.firstName} {student.lastName}
                          {student.otherNames && <span className="text-slate-500 font-normal"> {student.otherNames}</span>}
                        </p>
                        <p className="text-xs text-slate-500">DOB: {new Date(student.dob).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 font-medium">{student.class?.name || 'Unassigned'}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-900 font-medium">{student.parent?.fullName || 'N/A'}</p>
                        <p className="text-xs text-slate-500">{student.parent?.phone || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          student.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                        }`}>{student.status}</span>
                      </td>
                      
                      <td className="px-6 py-4 text-sm text-right relative">
                        <button onClick={() => setActiveDropdown(activeDropdown === student.id ? null : student.id)} className="p-2 text-slate-400 hover:text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors focus:outline-none">
                          <MoreVertical className="w-5 h-5" />
                        </button>

                        {/* Dropdown Menu */}
                        {activeDropdown === student.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)}></div>
                            <div className="absolute right-8 top-12 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-2 text-left animate-in fade-in slide-in-from-top-2">
                              
                              <Link href={`/students/${encodedId}`} className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                                <Eye className="w-4 h-4 text-slate-400" /> View Profile
                              </Link>
                              
                              {isSuperAdmin && <button onClick={() => openModal(student, 'edit')} className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                                <Edit className="w-4 h-4 text-slate-400" /> Edit Student
                              </button>}
                              {isSuperAdmin && <button onClick={() => openModal(student, 'class')} className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                                <BookOpen className="w-4 h-4 text-slate-400" /> Move to Another Class
                              </button>}
                              {(isSuperAdmin || (userRole === 'STAFF' && ['TEACHER', 'ACCOUNTANT_TEACHER'].includes(session?.user?.staffRole || '') && student.class?.teacherId === session?.user?.id)) && <button onClick={() => openModal(student, 'parent')} className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                                <LinkIcon className="w-4 h-4 text-slate-400" /> Link Existing Parent
                              </button>}
                              
                              <div className="h-px bg-slate-100 my-2"></div>
                              
                              {isSuperAdmin && <button onClick={() => resetStudentPassword(student.id)} className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                                <KeyRound className="w-4 h-4 text-slate-400" /> Reset Login Password
                              </button>}
                              <button onClick={() => openModal(student, 'message')} className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                                <MessageSquare className="w-4 h-4 text-slate-400" /> Message Parent
                              </button>

                              {isSuperAdmin && (
                                <>
                                  <div className="h-px bg-slate-100 my-2"></div>
                                  <button onClick={() => { void handleMarkInactive(student.id, `${student.firstName} ${student.lastName}`); setActiveDropdown(null); }} className="w-full px-4 py-2 text-sm text-amber-700 hover:bg-amber-50 flex items-center gap-2 transition-colors font-medium">
                                    <Trash2 className="w-4 h-4 text-amber-600" /> Mark Inactive (left school)
                                  </button>
                                </>
                              )}
                              
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
        </div>
      )}

      {/* ACTION MODALS */}
      {modalType && (
        <div className="fixed inset-0 bg-[#0A192F]/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animation-fade-in">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {modalType === 'edit' && 'Edit Student Profile'}
                {modalType === 'class' && 'Assign Class'}
                {modalType === 'parent' && 'Link Parent / Guardian'}
                {modalType === 'message' && 'Message Parent'}
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleActionSubmit} className="p-6 space-y-4">
              
              {/* EDIT STUDENT */}
              {modalType === 'edit' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                      <input type="text" required value={editForm.firstName} onChange={e => setEditForm({...editForm, firstName: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                      <input type="text" required value={editForm.lastName} onChange={e => setEditForm({...editForm, lastName: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                      <input type="date" required value={editForm.dob} onChange={e => setEditForm({...editForm, dob: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                      <select required value={editForm.gender} onChange={e => setEditForm({...editForm, gender: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm outline-none">
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  </div>
                  <p className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">Student status is managed separately so departure records and login access remain consistent.</p>
                </>
              )}

              {/* ASSIGN CLASS */}
              {modalType === 'class' && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Move {selectedStudent?.firstName} {selectedStudent?.lastName} from {selectedStudent?.class?.name || 'Unassigned'} to
                    <select required value={classForm.classId} onChange={e => setClassForm({classId: e.target.value})} className="mt-1 w-full rounded-lg border bg-slate-50 px-3 py-3 text-sm outline-none">
                      <option value="">Choose the correct class</option>
                      {classes.filter(c => c.id !== selectedStudent?.classId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </label>
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">Super admin only. The Student ID, Parent link, grades, attendance, exam attempts and invoices are retained. If class-based history exists, you will review its counts and confirm again before moving.</p>
                </div>
              )}

              {/* LINK EXISTING PARENT */}
              {modalType === 'parent' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-700">Student: <strong>{selectedStudent?.firstName} {selectedStudent?.lastName}</strong> · {selectedStudent?.class?.name || 'Unassigned'}</p>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                    <span className="font-semibold text-slate-600">Current Parent:</span>{' '}
                    <span className="text-slate-900">{selectedStudent?.parent?.fullName || 'None linked'}</span>
                    {selectedStudent?.parent?.phone && <span className="block text-xs text-slate-600">{selectedStudent.parent.phone}</span>}
                  </div>
                  <label className="block text-sm font-semibold text-slate-800">Search existing Parent accounts by name, email or phone
                    <input type="search" value={parentSearch}
                      onChange={event => { const value = event.target.value; setParentSearch(value); searchExistingParents(selectedStudent.id, value); }}
                      autoComplete="off" placeholder="Type at least 2 characters" className="mt-1 w-full rounded-lg border bg-slate-50 px-3 py-3 text-sm font-normal" />
                  </label>
                  <p className="text-xs text-slate-600">Only existing Parent records are shown. No Parent is created or their details changed here. Class teachers can link only a student in their assigned class; super admin can link any active student.</p>
                  {parentSearchLoading && <p role="status" className="text-sm text-blue-800">Searching existing Parent records…</p>}
                  {parentSearchError && <p role={parentOptions.length ? 'status' : 'alert'} className="text-sm text-amber-900">{parentSearchError}</p>}
                  {parentOptions.length > 0 && <fieldset className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2">
                    <legend className="px-1 text-xs font-semibold text-slate-600">Choose the verified guardian record</legend>
                    {parentOptions.map(parent => <button key={parent.id} type="button" aria-pressed={selectedParentId === parent.id}
                      onClick={() => setSelectedParentId(parent.id)}
                      className={`w-full rounded-lg border p-3 text-left focus-visible:outline-2 focus-visible:outline-[#0033A0] ${selectedParentId === parent.id ? 'border-blue-700 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                      <span className="block font-bold text-slate-900">{parent.fullName}</span>
                      <span className="block break-all text-xs text-slate-700">{parent.email || 'No email'} · {parent.phone}</span>
                      {parent.students.length > 0 && <span className="mt-1 block text-xs text-slate-600">Active linked children: {parent.students.map(child => `${child.firstName} ${child.lastName}${child.class?.name ? ` (${child.class.name})` : ''}`).join(', ')}</span>}
                      <span className="mt-1 block text-[10px] text-slate-500">Record {parent.id}</span>
                    </button>)}
                  </fieldset>}
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">Changing the link does not move or delete invoices/grades. Existing Parent-specific chat or SMS history remains with the original Parent account; contact the super admin if history also needs review.</p>
                </div>
              )}

              {/* MESSAGE PARENT */}
              {modalType === 'message' && (
                <>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
                    <p className="text-xs text-blue-800 font-medium">Sending message to parent of: <span className="font-bold">{selectedStudent?.firstName} {selectedStudent?.lastName}</span></p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                    <input type="text" required value={messageForm.subject} onChange={e => setMessageForm({...messageForm, subject: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                    <textarea required value={messageForm.message} onChange={e => setMessageForm({...messageForm, message: e.target.value})} className="w-full h-32 px-3 py-2 bg-slate-50 border rounded-lg text-sm outline-none resize-none" placeholder="Type your message here..." />
                  </div>
                </>
              )}

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setModalType(null)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-[#0033A0] hover:bg-[#002277] text-white rounded-lg font-medium text-sm transition-colors flex justify-center items-center gap-2">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
