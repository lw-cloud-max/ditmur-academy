"use client";

import { useState, useEffect } from 'react';
import { Users, GraduationCap, CreditCard, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ParentDashboard({ parentId }: { parentId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We can fetch parents list and filter, or make a new API route later. 
    // Reusing the parents GET API for now.
    fetch('/api/parents')
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          const p = result.data.find((x: any) => x.id === parentId || x.email === parentId);
          setData(p);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [parentId]);

  if (loading) {
    return <div className="p-20 flex justify-center"><Loader2 className="w-12 h-12 text-[#0033A0] animate-spin" /></div>;
  }

  if (!data) return (
    <div className="space-y-6 pb-32 max-w-6xl mx-auto animation-fade-in">
      <div className="bg-[#0A192F] rounded-3xl p-8 relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#0033A0] rounded-full blur-3xl opacity-50 -mr-20 -mt-20"></div>
        <div className="relative z-10 text-white">
          <h1 className="text-3xl font-black tracking-tight">Welcome, Test Parent!</h1>
          <p className="text-[#FFD700] font-bold tracking-wide mt-1">Parent ID: {parentId}</p>
        </div>
      </div>
      <div className="p-12 text-center text-slate-500 font-medium bg-white rounded-xl border border-slate-200">
        We could not find your detailed parent profile in the database. 
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-32 max-w-6xl mx-auto animation-fade-in">
      <div className="bg-[#0A192F] rounded-3xl p-8 relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#0033A0] rounded-full blur-3xl opacity-50 -mr-20 -mt-20"></div>
        <div className="relative z-10 text-white">
          <h1 className="text-3xl font-black tracking-tight">Welcome, {data.fullName}</h1>
          <p className="text-blue-200 mt-1">Ditmur Academy Parent Portal</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#0033A0]" /> My Wards
          </h2>
          <div className="space-y-3">
            {data.students?.length === 0 ? (
              <p className="text-slate-500 text-sm">No children linked to your account.</p>
            ) : (
              data.students.map((stu: any) => (
                <div key={stu.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div>
                    <p className="font-bold text-slate-900">{stu.firstName} {stu.lastName}</p>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">{stu.class?.name || 'Unassigned'} • {stu.id}</p>
                  </div>
                  <Link href="/broadsheet" className="p-2 bg-white text-blue-600 rounded-lg shadow-sm border border-slate-200 hover:text-white hover:bg-[#0033A0]">
                    <GraduationCap className="w-4 h-4" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-500" /> Financial Overview
          </h2>
          <div className="p-6 bg-amber-50 rounded-xl border border-amber-100 text-center mb-4">
            <p className="text-sm font-bold text-amber-800 uppercase tracking-wider mb-1">Outstanding Balance</p>
            <p className="text-3xl font-black text-amber-900">Check Invoices</p>
          </div>
          <Link href="/payments" className="w-full flex items-center justify-center gap-2 py-3 bg-[#0033A0] hover:bg-[#002277] text-white rounded-xl font-bold transition-colors">
            View Fee Payments <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
