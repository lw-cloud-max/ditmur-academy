"use client";

import Link from 'next/link';
import { ArrowRight, BookOpen, GraduationCap, Users, ShieldCheck, Sparkles, Trophy } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-[#0033A0] selection:text-white">
      
      {/* Navigation */}
      <nav className="absolute top-0 w-full z-50 px-6 py-6 lg:px-12 flex justify-between items-center bg-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-0.5 shadow-md">
            <img src="/logo.jpg" alt="Ditmur Academy" className="w-full h-full object-contain rounded-full" />
          </div>
          <span className="font-black text-white text-xl tracking-tight uppercase drop-shadow-md">Ditmur Academy</span>
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md rounded-full font-bold text-sm transition-all shadow-sm">
            Portal Login
          </Link>
          <Link href="/apply" className="px-6 py-2.5 bg-[#FFD700] hover:bg-[#e6c200] text-slate-900 rounded-full font-black text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
            Apply Now
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 lg:px-12 bg-gradient-to-br from-[#0A192F] to-[#002277] overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#0033A0] rounded-full blur-[150px] opacity-40 -mr-64 -mt-64"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#FFD700] rounded-full blur-[150px] opacity-10 -ml-64 -mb-64"></div>
        
        <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-200 text-xs font-bold uppercase tracking-wider mb-6">
              <Sparkles className="w-4 h-4 text-[#FFD700]" /> Admission for 2025/2026 is open
            </div>
            <h1 className="text-5xl lg:text-7xl font-black text-white leading-[1.1] mb-6 tracking-tight">
              Cultivating <span className="text-[#FFD700]">Excellence</span> <br/>& Discipline.
            </h1>
            <p className="text-lg text-blue-100 mb-8 max-w-lg leading-relaxed">
              Empowering the next generation of leaders with world-class education, state-of-the-art facilities, and a modernized learning ecosystem.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/apply" className="px-8 py-4 bg-[#FFD700] hover:bg-[#e6c200] text-slate-900 rounded-xl font-black text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 hover:-translate-y-1">
                Start Application <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/login" className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-sm rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2">
                Student & Parent Portal
              </Link>
            </div>
          </div>
          
          <div className="relative hidden lg:block h-[600px]">
             {/* Abstract Geometric Representation of a School / Tech */}
             <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-[40px] border border-white/10 backdrop-blur-xl transform rotate-3 scale-95 transition-transform duration-700 hover:rotate-0 hover:scale-100"></div>
             <div className="absolute inset-0 bg-gradient-to-bl from-white/10 to-transparent rounded-[40px] border border-white/20 shadow-2xl p-8 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                    <GraduationCap className="w-8 h-8 text-[#FFD700]" />
                  </div>
                  <div className="px-4 py-2 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold border border-emerald-500/30">
                    Top 1% Nationwide
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-4 w-3/4 bg-white/20 rounded-full"></div>
                  <div className="h-4 w-1/2 bg-white/10 rounded-full"></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/10">
                    <h4 className="text-3xl font-black text-white">2.5k+</h4>
                    <p className="text-blue-200 text-sm font-medium mt-1">Active Students</p>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/10">
                    <h4 className="text-3xl font-black text-white">100%</h4>
                    <p className="text-blue-200 text-sm font-medium mt-1">WAEC Pass Rate</p>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-black text-slate-900 mb-4">Why Choose Ditmur Academy?</h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg">We provide a holistic educational experience backed by modern technology to ensure your child's success.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 hover:-translate-y-2 transition-transform duration-300 group">
            <div className="w-14 h-14 bg-blue-50 text-[#0033A0] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">World-Class Curriculum</h3>
            <p className="text-slate-600 leading-relaxed">Our robust academic scheme seamlessly blends national standards with international best practices to prepare students globally.</p>
          </div>
          
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 hover:-translate-y-2 transition-transform duration-300 group">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Trophy className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Gamified Learning</h3>
            <p className="text-slate-600 leading-relaxed">Students engage in daily AI-powered trivia challenges, interactive study hubs, and compete on the academic Hall of Fame.</p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 hover:-translate-y-2 transition-transform duration-300 group">
            <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Modern Parent Portal</h3>
            <p className="text-slate-600 leading-relaxed">Parents can track real-time academic results, monitor attendance, and securely pay school fees online via Paystack.</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-[#0A192F] py-20 px-6 text-center">
        <h2 className="text-3xl lg:text-4xl font-black text-white mb-6">Ready to join our community?</h2>
        <p className="text-blue-200 mb-10 max-w-xl mx-auto text-lg">Secure your child's future today by applying online. The application process takes less than 5 minutes.</p>
        <Link href="/apply" className="inline-flex items-center gap-2 px-8 py-4 bg-[#FFD700] hover:bg-[#e6c200] text-slate-900 rounded-xl font-black text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
          Apply for Admission <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
      
    </div>
  );
}
