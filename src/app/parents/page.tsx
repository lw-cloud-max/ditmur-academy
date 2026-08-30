"use client";

import { useState, useEffect } from 'react';
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
    phone: '',
    password: ''
  });

  useEffect(() => {
    fetchParents();
  }, []);

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

  const handleEditParent = (parent: Parent) => {
    setEditingParent(parent);
    setEditForm({
      fullName: parent.fullName,
      email: parent.email || '',
      phone: parent.phone,
      password: ''
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
          ...editForm,
          password: editForm.password || undefined // Only update if provided
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

      {/* Parents List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
          <div className="divide-y divide-slate-100">
            {filteredParents.map((parent) => (
              <div key={parent.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-blue-100 text-[#0033A0] rounded-full flex items-center justify-center shrink-0">
                      <UserCircle className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-900">{parent.fullName}</h3>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                          {parent.students.length} {parent.students.length === 1 ? 'child' : 'children'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500 mb-2">
                        {parent.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" />
                            {parent.email}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {parent.phone}
                        </span>
                      </div>
                      {parent.students.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {parent.students.map(student => (
                            <span key={student.id} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                              {student.firstName} {student.lastName}
                              {student.class?.name && ` (${student.class.name})`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === parent.id ? null : parent.id)}
                      className="p-2 text-slate-400 hover:text-[#0033A0] hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {activeDropdown === parent.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)}></div>
                        <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-2">
                          <button
                            onClick={() => handleEditParent(parent)}
                            className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Edit className="w-4 h-4 text-slate-400" /> Edit Details
                          </button>
                          <button
                            onClick={() => handleDeleteParent(parent.id, parent.fullName)}
                            className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password (leave blank to keep current)</label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                  placeholder="Enter new password..."
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
