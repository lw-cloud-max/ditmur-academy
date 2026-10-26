"use client";

import Link from 'next/link';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import TemporaryPasswordNotice, { type IssuedCredential } from '@/components/TemporaryPasswordNotice';
import { 
  Search, Plus, Filter, MoreVertical, Users, Loader2, Trash2,
  Edit, Eye, Mail, Phone, X, Save, UserCircle
} from 'lucide-react';

interface Parent {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  students: { id: string; firstName: string; lastName: string; class?: { name: string } }[];
  createdAt: string;
}

export default function ParentsPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === 'ADMIN' && session?.user?.id === 'admin-1';
  const [credential, setCredential] = useState<IssuedCredential | null>(null);
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phone: ''
  });

  const fetchParents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/parents');
      const data = await res.json();
      if (data.success) {
        setParents(data.data);
      }
    } catch (error) {
      console.error('Error fetching parents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchParents(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleEditParent = (parent: Parent) => {
    setEditingParent(parent);
    setEditForm({
      fullName: parent.fullName,
      email: parent.email || '',
      phone: parent.phone
    });
    setActiveDropdown(null);
  };

  const handleSaveParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParent) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/parents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingParent.id,
          ...editForm
        })
      });

      const data = await res.json();
      if (data.success) {
        setEditingParent(null);
        fetchParents();
        alert('Parent updated successfully!');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error updating parent:', error);
      alert('Failed to update parent');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteParent = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? This will also unlink all their children.`)) return;

    try {
      const res = await fetch(`/api/parents?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchParents();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting parent:', error);
    }
  };

  const resetParentPassword = async (id: string) => {
    setCredential(null); setActiveDropdown(null);
    if (!confirm('Reset this parent login? The previous password will stop working.')) return;
    try {
      const res = await fetch('/api/credentials/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'PARENT', id }) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Reset failed');
      setCredential(data.data);
    } catch (error) { alert(error instanceof Error ? error.message : 'Reset failed'); }
  };

  const filteredParents = parents.filter(parent => {
    return (
      searchQuery === '' ||
      parent.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (parent.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      parent.phone.includes(searchQuery) ||
      parent.students.some(s => 
        s.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.lastName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  });

  return (
    <div className="space-y-6 pb-32 max-w-7xl mx-auto animation-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserCircle className="w-7 h-7 text-[#0033A0]" />
            Parents Directory
          </h1>
          <p className="text-slate-500 mt-1">Manage parent accounts and their linked students</p>
          {isSuperAdmin && <div className="mt-2 flex flex-wrap gap-2">
            <a href="/parent-reconciliation" className="inline-flex min-h-10 items-center rounded-lg bg-blue-50 px-3 text-sm font-bold text-blue-800 hover:bg-blue-100">Preview Excel parent roster (no changes)</a>
            <Link href="/parent-households" className="inline-flex min-h-10 items-center rounded-lg bg-emerald-50 px-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100">Review possible sibling households</Link>
          </div>}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by parent name, email, phone, or student name..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
            />
          </div>
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            {filteredParents.length} of {parents.length} parents
          </div>
        </div>
      </div>

      <TemporaryPasswordNotice credential={credential} onClose={() => setCredential(null)} />
      {/* Parents List */}
      <div className="min-w-0 max-w-full bg-white rounded-xl border border-slate-200 shadow-sm">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" />
          </div>
        ) : filteredParents.length === 0 ? (
          <div className="text-center p-12 text-slate-500">
            <UserCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-medium">No parents found</p>
            <p className="text-sm mt-1">
              {searchQuery ? 'Try adjusting your search' : 'Parents will appear here when students are admitted'}
            </p>
          </div>
        ) : (
          <div className="min-w-0 max-w-full divide-y divide-slate-100">
            {filteredParents.map((parent) => (
              <div key={parent.id} className="min-w-0 max-w-full p-4 hover:bg-slate-50 transition-colors">
                <div className="flex min-w-0 max-w-full items-start justify-between gap-2 sm:gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
                    <div className="w-12 h-12 bg-blue-100 text-[#0033A0] rounded-full flex items-center justify-center shrink-0">
                      <UserCircle className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <h3 className="min-w-0 break-words font-bold text-slate-900">{parent.fullName}</h3>
                        <span className="shrink-0 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                          {parent.students.length} {parent.students.length === 1 ? 'child' : 'children'}
                        </span>
                      </div>
                      <div className="mb-2 flex min-w-0 max-w-full flex-col gap-1 text-sm text-slate-500 sm:flex-row sm:flex-wrap sm:gap-x-4">
                        {parent.email && (
                          <span className="flex min-w-0 max-w-full items-start gap-1">
                            <Mail aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <a href={`mailto:${parent.email}`} title={parent.email} className="block min-w-0 max-w-full break-all underline-offset-2 hover:text-[#0033A0] hover:underline">{parent.email}</a>
                          </span>
                        )}
                        <span className="flex min-w-0 max-w-full items-start gap-1 break-words">
                          <Phone aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <a href={`tel:${parent.phone.replace(/[^+\d]/g, '')}`} className="min-w-0 break-words underline-offset-2 hover:text-[#0033A0] hover:underline">{parent.phone}</a>
                        </span>
                      </div>
                      {parent.students.length > 0 && (
                        <div className="flex min-w-0 flex-wrap gap-2">
                          {parent.students.map(student => (
                            <span key={student.id} className="max-w-full break-words px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                              {student.firstName} {student.lastName}
                              {student.class?.name && ` (${student.class.name})`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="relative z-10 shrink-0">
                    <button type="button"
                      aria-label={`Actions for ${parent.fullName}`}
                      aria-expanded={activeDropdown === parent.id}
                      aria-haspopup="menu"
                      onClick={() => setActiveDropdown(activeDropdown === parent.id ? null : parent.id)}
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-blue-50 hover:text-[#0033A0] focus-visible:outline-2 focus-visible:outline-[#0033A0]"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {activeDropdown === parent.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)}></div>
                        <div role="menu" className="absolute right-0 top-11 z-50 w-48 rounded-xl border border-slate-200 bg-white py-2 shadow-xl">
                          <button
                            onClick={() => handleEditParent(parent)}
                            role="menuitem" className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Edit className="w-4 h-4 text-slate-400" /> Edit Details
                          </button>
                          {isSuperAdmin && <button type="button" onClick={() => resetParentPassword(parent.id)} role="menuitem" className="w-full px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 text-left">Reset Login Password</button>}
                          <button
                            onClick={() => handleDeleteParent(parent.id, parent.fullName)}
                            role="menuitem" className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" /> Delete Parent
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Parent Modal */}
      {editingParent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animation-fade-in">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit Parent Details</h3>
                <p className="text-xs text-slate-500 mt-1">Update parent information</p>
              </div>
              <button onClick={() => setEditingParent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveParent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({...editForm, fullName: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={editForm.phone}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingParent(null)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-[#0033A0] text-white rounded-xl font-bold hover:bg-[#002277] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
