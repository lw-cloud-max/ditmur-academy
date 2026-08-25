"use client";

import { LockKeyhole, AlertCircle, User, Users, GraduationCap, Monitor, BarChart3, Cloud, ShieldCheck, ArrowRight, School, Sparkles } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [roleType, setRoleType] = useState('STAFF');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    try {
      const res = await signIn('credentials', {
        username,
        password,
        roleType,
        redirect: false,
      });

      if (res?.error) {
        setError(`Invalid ${roleType === 'STUDENT' ? 'Student ID' : 'Email'} or password`);
        setLoading(false);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eaf4fa] flex flex-col md:flex-row overflow-hidden font-sans selection:bg-blue-500 selection:text-white">
      
      {/* LEFT SIDE: Brand Presentation (Hidden on Mobile) */}
      <div className="hidden md:flex flex-1 bg-gradient-to-br from-[#0A192F] to-[#002277] text-white p-12 flex-col justify-between relative overflow-hidden shadow-[10px_0_30px_rgba(0,0,0,0.2)] z-20">
        
        {/* Animated Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#FFD700] rounded-full blur-[120px] opacity-10"></div>
        
        {/* Header Branding */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,215,0,0.4)] p-2 shrink-0 border-2 border-white/20">
             <img src="/logo.jpg" alt="Ditmur Logo" className="w-[85%] h-[85%] object-contain rounded-full" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight uppercase font-serif drop-shadow-md">Ditmur Academy</h1>
            <p className="text-[#FFD700] font-bold text-xs tracking-[0.2em] uppercase mt-0.5 opacity-90">Cloud Management</p>
          </div>
        </div>

        {/* Hero Text */}
        <div className="relative z-10 max-w-xl my-auto pt-10">
          <h2 className="text-5xl lg:text-6xl font-black leading-[1.1] mb-6 tracking-tight">Cultivating <br/><span className="text-[#FFD700]">Excellence</span> <br/>and Discipline.</h2>
          <p className="text-blue-100 text-lg leading-relaxed mb-10 max-w-md font-medium opacity-80">Access the next-generation school management system. Stay connected with real-time academic records, live CBT assessments, and automated fee processing.</p>
          
          <div className="flex gap-4">
            <div className="flex items-center gap-2 bg-white/10 px-5 py-2.5 rounded-xl backdrop-blur-md border border-white/10 shadow-lg">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-bold tracking-wide">Secure Access</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-5 py-2.5 rounded-xl backdrop-blur-md border border-white/10 shadow-lg">
              <Sparkles className="w-5 h-5 text-[#FFD700]" />
              <span className="text-sm font-bold tracking-wide">AI Powered</span>
            </div>
          </div>
        </div>
        
        <div className="relative z-10 text-sm text-blue-200/50 font-bold tracking-widest uppercase">
          &copy; {new Date().getFullYear()} Ditmur Academy
        </div>
      </div>

      {/* RIGHT SIDE: Login Card Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-slate-50 relative z-10">
        
        {/* Faint Grid Background */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#0033A0 1px, transparent 1px), linear-gradient(90deg, #0033A0 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        
        <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden relative z-10 animation-fade-in-up">
          
          {/* Mobile Header (Only visible on small screens) */}
          <div className="md:hidden bg-gradient-to-br from-[#0A192F] to-[#002277] p-10 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700] rounded-full blur-[60px] opacity-20 -mr-10 -mt-10"></div>
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-5 shadow-[0_0_20px_rgba(255,215,0,0.4)] p-1.5 border-2 border-white/20">
              <img src="/logo.jpg" alt="Ditmur Academy Logo" className="w-[85%] h-[85%] object-contain rounded-full" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase font-serif">Ditmur Academy</h1>
            <p className="text-[#FFD700] mt-1.5 text-[10px] font-bold uppercase tracking-[0.2em] opacity-90">Cloud Management</p>
          </div>

          <div className="p-8 pb-4 text-center hidden md:block">
             <h2 className="text-3xl font-black text-slate-800 tracking-tight">Welcome Back</h2>
             <p className="text-slate-400 mt-2 font-medium">Please select your role and sign in.</p>
          </div>

          {/* Role Selection Tabs */}
          <div className="flex px-6 sm:px-8 mt-6 md:mt-4 mb-6">
            <div className="flex w-full bg-slate-100 rounded-2xl p-1.5 relative shadow-inner border border-slate-200/50">
              <button 
                type="button"
                onClick={() => { setRoleType('STAFF'); setError(''); }}
                className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all z-10 flex justify-center items-center gap-1.5 ${roleType === 'STAFF' ? 'bg-white text-[#2f88ff] shadow-md border border-slate-200/50' : 'text-slate-400 hover:text-slate-700'}`}
              >
                <School className="w-4 h-4" /> Staff
              </button>
              <button 
                type="button"
                onClick={() => { setRoleType('STUDENT'); setError(''); }}
                className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all z-10 flex justify-center items-center gap-1.5 ${roleType === 'STUDENT' ? 'bg-white text-[#2f88ff] shadow-md border border-slate-200/50' : 'text-slate-400 hover:text-slate-700'}`}
              >
                <GraduationCap className="w-4 h-4" /> Student
              </button>
              <button 
                type="button"
                onClick={() => { setRoleType('PARENT'); setError(''); }}
                className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all z-10 flex justify-center items-center gap-1.5 ${roleType === 'PARENT' ? 'bg-white text-[#2f88ff] shadow-md border border-slate-200/50' : 'text-slate-400 hover:text-slate-700'}`}
              >
                <Users className="w-4 h-4" /> Parent
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 pt-0 space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-start gap-3 border border-red-100/50 animation-fade-in">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="font-bold">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2 pl-1">
                {roleType === 'STUDENT' ? 'Student ID' : 'Email Address'}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  {roleType === 'STUDENT' ? <GraduationCap className="h-5 w-5 text-slate-400 group-focus-within:text-[#2f88ff] transition-colors" /> : 
                   roleType === 'PARENT' ? <Users className="h-5 w-5 text-slate-400 group-focus-within:text-[#2f88ff] transition-colors" /> :
                   <User className="h-5 w-5 text-slate-400 group-focus-within:text-[#2f88ff] transition-colors" />}
                </div>
                <input
                  name="username"
                  type={roleType === 'STUDENT' ? 'text' : 'email'}
                  required
                  placeholder={
                    roleType === 'STUDENT' ? 'e.g. DIT/STU/001' : 
                    roleType === 'PARENT' ? 'Enter registered email' : 
                    'Enter staff email'
                  }
                  className={`block w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#2f88ff]/10 focus:border-[#2f88ff] focus:bg-white transition-all text-sm font-bold shadow-inner ${roleType === 'STUDENT' ? 'uppercase font-mono tracking-widest' : ''}`}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2 pl-1 pr-1">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">Password</label>
                {roleType !== 'STUDENT' && (
                  <a href="#" className="text-[11px] font-black text-[#2f88ff] hover:text-[#002277] transition-colors uppercase tracking-wider">Forgot?</a>
                )}
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <LockKeyhole className="h-5 w-5 text-slate-400 group-focus-within:text-[#2f88ff] transition-colors" />
                </div>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="block w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#2f88ff]/10 focus:border-[#2f88ff] focus:bg-white transition-all text-sm font-bold shadow-inner tracking-widest"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-3 py-4 mt-6 rounded-xl shadow-[0_8px_20px_rgba(47,136,255,0.3)] text-sm font-black text-white bg-gradient-to-r from-[#2f88ff] to-[#0033A0] hover:from-[#0033A0] hover:to-[#002277] focus:outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed group uppercase tracking-widest"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Authenticating...
                </>
              ) : (
                <>
                  Secure Login <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {roleType === 'STAFF' && (
            <div className="pb-8 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Admin: <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200 shadow-sm ml-1">admin@ditmur.com</span> / <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200 shadow-sm">admin123</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
