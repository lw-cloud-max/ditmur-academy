"use client";

import { useState, useEffect } from 'react';
import { Users, GraduationCap, School, CreditCard, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalStaff: 0,
    activeClasses: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const res = await fetch('/api/dashboard');
        const data = await res.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch (error) {
        console.error("Failed to load stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardStats();
  }, []);

  const statCards = [
    { title: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'Total Staff', value: stats.totalStaff, icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { title: 'Active Classes', value: stats.activeClasses, icon: School, color: 'text-purple-600', bg: 'bg-purple-100' },
    { title: 'Revenue (Term)', value: `$${stats.totalRevenue.toLocaleString()}`, icon: CreditCard, color: 'text-amber-600', bg: 'bg-amber-100' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500">Welcome back! Here's an overview of your school today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.title} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
            {loading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            )}
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {[
              { text: 'New student admission processed successfully.', time: 'Just now' },
              { text: 'Term 2 configuration updated by Admin.', time: '2 hours ago' },
              { text: 'Math assessment format changed to CBT.', time: '5 hours ago' },
              { text: 'Entrance Exam scheduled for next Monday.', time: '1 day ago' },
            ].map((activity, i) => (
              <div key={i} className="flex gap-4 items-start pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-sm text-slate-700">{activity.text}</p>
                  <p className="text-xs text-slate-400 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 h-fit">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link href="/admissions" className="block w-full text-left px-4 py-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-700 transition-colors">
              + Process New Admission
            </Link>
            <Link href="/payments" className="block w-full text-left px-4 py-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-700 transition-colors">
              + Record Payment
            </Link>
            <Link href="/messaging" className="block w-full text-left px-4 py-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-700 transition-colors">
              + Send Broadcast Message
            </Link>
            <Link href="/entrance-exam" className="block w-full text-left px-4 py-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-700 transition-colors">
              + Create CBT Exam
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
