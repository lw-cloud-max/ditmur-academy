"use client";

import { LockKeyhole, AlertCircle, User, Users, GraduationCap } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// CACHE BUSTER COMMENT TO FORCE REBUILD v2
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
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animation-fade-in">
        
        {/* Header */}
        <div className="bg-[#0A192F] p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#FFD700]"></div>
          
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg p-1 border-2 border-[#FFD700]">
            <img src="/logo.jpg" alt="Ditmur Academy Logo" className="w-full h-full rounded-full object-contain" />
          </div>
          
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">Ditmur Academy</h1>
          <p className="text-[#FFD700] mt-1.5 text-[10px] font-bold uppercase tracking-widest">Cultivating Excellence and Discipline</p>
        </div>

        {/* Role Selection Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button 
            onClick={() => { setRoleType('STAFF'); setError(''); }}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex justify-center items-center gap-2 transition-colors ${roleType === 'STAFF' ? 'bg-white text-[#0033A0] border-b-2 border-[#0033A0]' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <GraduationCap className="w-4 h-4" /> Staff
          </button>
          <button 
            onClick={() => { setRoleType('STUDENT'); setError(''); }}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex justify-center items-center gap-2 transition-colors ${roleType === 'STUDENT' ? 'bg-white text-[#0033A0] border-b-2 border-[#0033A0]' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <User className="w-4 h-4" /> Student
          </button>
          <button 
            onClick={() => { setRoleType('PARENT'); setError(''); }}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex justify-center items-center gap-2 transition-colors ${roleType === 'PARENT' ? 'bg-white text-[#0033A0] border-b-2 border-[#0033A0]' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Users className="w-4 h-4" /> Parent
          </button>
        </div>

        {/* Login Form */}
        <div className="p-8">
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                {roleType === 'STUDENT' ? 'Student ID' : 'Email Address'}
              </label>
              <input 
                type={roleType === 'STUDENT' ? 'text' : 'email'} 
                name="username"
                required 
                className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0033A0] outline-none transition-all ${roleType === 'STUDENT' ? 'uppercase font-mono font-bold text-[#0033A0]' : ''}`}
                placeholder={roleType === 'STUDENT' ? 'DIT/STU/001' : roleType === 'PARENT' ? 'parent@email.com' : 'admin@school.com'}
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-bold text-slate-700">Password</label>
                <a href="#" className="text-xs text-[#0033A0] hover:text-[#002277] font-bold">Forgot?</a>
              </div>
              <input 
                type="password" 
                name="password"
                required 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0033A0] outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full text-white py-3.5 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 mt-4 shadow-md ${
                loading ? 'bg-[#0033A0]/60 cursor-not-allowed' : 'bg-[#0033A0] hover:bg-[#002277]'
              }`}
            >
              <LockKeyhole className="w-4 h-4" /> 
              {loading ? 'Authenticating...' : `Secure ${roleType} Login`}
            </button>
          </form>

          {roleType === 'STAFF' && (
            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500 font-medium">
                For demo purposes, use:<br/>
                <span className="font-mono bg-slate-100 px-1 rounded text-slate-700 mt-1 inline-block">admin@school.com</span> / <span className="font-mono bg-slate-100 px-1 rounded text-slate-700">admin123</span>
              </p>
            </div>
          )}
          {roleType === 'STUDENT' && (
            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Enter the Student ID provided to you during admission.<br/>
                <span className="font-mono bg-slate-100 px-1 rounded text-slate-700 mt-1 inline-block">Default Password: student123</span>
              </p>
            </div>
          )}
          {roleType === 'PARENT' && (
            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Log in using the email address you registered with the school.<br/>
                <span className="font-mono bg-slate-100 px-1 rounded text-slate-700 mt-1 inline-block">Default Password: parent123</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
