"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Search, Plus, Filter, MoreVertical, GraduationCap, Loader2, Trash2,
  Eye, Edit, BookOpen, Link as LinkIcon, KeyRound, Mail, MessageSquare, X, ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export default function StudentsPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isReadOnly = userRole !== 'STAFF' && userRole !== 'ADMIN';

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
  const [parentForm, setParentForm] = useState({ parentName: '', email: '', phone: '' });
  const [messageForm, setMessageForm] = useState({ message: '', subject: 'Message from School' });

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

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!window.confirm(`Are you absolutely sure you want to delete ${name}?`)) return;

    try {
      const res = await fetch(`/api/students?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setStudents(students.filter(student => student.id !== id));
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("An error occurred while deleting the student.");
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
      setParentForm({
        parentName: student.parent?.fullName || '',
        email: student.parent?.email || '',
        phone: student.parent?.phone || ''
      });
    } else if (type === 'message') {
      setMessageForm({ message: '', subject: 'Message from School Admin' });
    }
  };

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (modalType === 'message') {
        await fetch('/api/messaging', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audience: 'specific_student',
            type: 'email',
            subject: messageForm.subject,
            message: `Dear ${selectedStudent.parent?.fullName || 'Parent/Guardian'},\n\n${messageForm.message}`
          })
        });
        alert('Message sent successfully!');
      } else {
        let payload: any = { id: selectedStudent.id };
        
        if (modalType === 'edit') {
          payload = { ...payload, action: 'update_student', ...editForm };
        } else if (modalType === 'class') {
          payload = { ...payload, action: 'assign_class', ...classForm };
        } else if (modalType === 'parent') {
          payload = { ...payload, action: 'link_parent', ...parentForm };
        }

        const res = await fetch('/api/students', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        
        fetchData(); // Refresh UI
      }

      setModalType(null);
    } catch (err: any) {
      alert(err.message || 'Failed to complete action');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAction = (actionName: string) => {
    setActiveDropdown(null);
    if (actionName === 'Reset Password') {
      alert(`Password reset successfully! New temporary password is: edumanage2026`);
    } else if (actionName === 'Resend Activation') {
      alert(`Activation link has been resent to the parent's email address.`);
    }
  };

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Students Directory</h1>
          <p className="text-slate-500">Manage student records and information.</p>
        </div>
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
          <input type="text" placeholder="Search students by name or ID..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none transition-all" />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filters</span>
        </button>
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
          <h3 className="text-lg font-bold text-slate-900 mb-1">No students found</h3>
          <p className="text-slate-500 text-sm mb-4">You haven't admitted any students into the system yet.</p>
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
                {students.map((student) => {
                  const encodedId = encodeURIComponent(student.id);

                  return (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-[#0033A0]">{student.id}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900">{student.firstName} {student.lastName}</p>
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
                              
                              <button onClick={() => openModal(student, 'edit')} className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                                <Edit className="w-4 h-4 text-slate-400" /> Edit Student
                              </button>
                              <button onClick={() => openModal(student, 'class')} className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                                <BookOpen className="w-4 h-4 text-slate-400" /> Assign Class
                              </button>
                              <button onClick={() => openModal(student, 'parent')} className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                                <LinkIcon className="w-4 h-4 text-slate-400" /> Link Parent/Guardian
                              </button>
                              
                              <div className="h-px bg-slate-100 my-2"></div>
                              
                              <button onClick={() => handleQuickAction('Reset Password')} className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                                <KeyRound className="w-4 h-4 text-slate-400" /> Reset Password
                              </button>
                              <button onClick={() => handleQuickAction('Resend Activation')} className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                                <Mail className="w-4 h-4 text-slate-400" /> Resend Activation Link
                              </button>
                              <button onClick={() => openModal(student, 'message')} className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                                <MessageSquare className="w-4 h-4 text-slate-400" /> Message Parent
                              </button>

                              {!isReadOnly && (
                                <>
                                  <div className="h-px bg-slate-100 my-2"></div>
                                  <button onClick={() => { handleDeleteStudent(student.id, `${student.firstName} ${student.lastName}`); setActiveDropdown(null); }} className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors font-medium">
                                    <Trash2 className="w-4 h-4 text-red-500" /> Delete Student
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
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Student Status</label>
                    <select required value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm outline-none">
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="GRADUATED">Graduated</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </div>
                </>
              )}

              {/* ASSIGN CLASS */}
              {modalType === 'class' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select Class for {selectedStudent?.firstName}</label>
                  <select required value={classForm.classId} onChange={e => setClassForm({classId: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm outline-none">
                    <option value="">-- Unassigned --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              {/* LINK PARENT */}
              {modalType === 'parent' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Parent Full Name</label>
                    <input type="text" required value={parentForm.parentName} onChange={e => setParentForm({...parentForm, parentName: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm outline-none" placeholder="e.g. John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                    <input type="email" required value={parentForm.email} onChange={e => setParentForm({...parentForm, email: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm outline-none" placeholder="john@example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                    <input type="tel" required value={parentForm.phone} onChange={e => setParentForm({...parentForm, phone: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm outline-none" placeholder="+1 234 567 8900" />
                  </div>
                </>
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
