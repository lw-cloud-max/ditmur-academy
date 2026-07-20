"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Search, Mail, Phone, Users, ShieldAlert, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ParentsPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isReadOnly = userRole !== 'STAFF' && userRole !== 'ADMIN';

  const [parents, setParents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchParents = async () => {
      try {
        const res = await fetch('/api/parents');
        const data = await res.json();
        if (data.success) {
          setParents(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch parents");
      } finally {
        setLoading(false);
      }
    };
    fetchParents();
  }, []);

  return (
    <div className="space-y-6 pb-32">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Parents & Guardians</h1>
          <p className="text-slate-500">Manage contact information and linked students.</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search parents by name, email, or phone..." 
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
          />
        </div>
      </div>

      {isReadOnly && (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-sm">
          <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900 mb-1">Access Restricted</h3>
          <p className="text-slate-500 text-sm">You do not have permission to view the global Parents Directory.</p>
        </div>
      )}

      {/* Parents Grid */}
      {!isReadOnly && loading ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" />
        </div>
      ) : parents.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No parents found</h3>
          <p className="text-slate-500 text-sm">Parents are automatically created when you admit a new student or link them in the directory.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {parents.map((parent) => (
            <div key={parent.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-lg">
                    {parent.fullName.charAt(0)}
                  </div>
                </div>
                
                <h3 className="font-bold text-slate-900 text-lg mb-4">{parent.fullName}</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-slate-400" />
                    </div>
                    <span className="font-medium">{parent.phone || 'No phone provided'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-slate-400" />
                    </div>
                    <span className="truncate">{parent.email || 'No email provided'}</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Linked Students</p>
                  <div className="space-y-2">
                    {parent.students.length > 0 ? (
                      parent.students.map((student: any) => (
                        <Link 
                          href={`/students/${encodeURIComponent(student.id)}`} 
                          key={student.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors group"
                        >
                          <div>
                            <p className="text-sm font-bold text-slate-900 group-hover:text-[#0033A0] transition-colors">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-xs text-slate-500">{student.class?.name || 'Unassigned'} • {student.id}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#0033A0] transition-colors" />
                        </Link>
                      ))
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded-lg">
                        <ShieldAlert className="w-4 h-4" /> No active students linked
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 border-t border-slate-100 flex gap-2">
                <Link 
                  href="/messaging" 
                  className="flex-1 text-center py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-sm font-bold text-slate-700 transition-colors"
                >
                  Message
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
