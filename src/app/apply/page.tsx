"use client";

import { useState } from 'react';
import { ShieldCheck, GraduationCap, Users, User, Phone, Mail, Calendar as CalendarIcon, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { usePaystackPayment } from 'react-paystack';
import Link from 'next/link';

export default function ApplicationForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [applicationId, setApplicationId] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    gender: 'Male',
    previousSchool: '',
    parentName: '',
    email: '',
    phone: '',
  });

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Paystack Configuration for Application Fee (5000 NGN)
    const config = {
      reference: 'APP_' + (new Date()).getTime().toString(),
      email: formData.email,
      amount: 5000 * 100, // 5000 NGN in kobo
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_KEY || 'pk_test_mock_key',
    };

    const initializePayment = usePaystackPayment(config);

    initializePayment({
      onSuccess: async (reference: any) => {
        setLoading(true);
        try {
          const res = await fetch('/api/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData, reference: reference.reference })
          });
          const data = await res.json();
          if (data.success) {
            setApplicationId(data.data.id);
            setSuccess(true);
          } else {
            alert("Payment recorded, but application saving failed. Contact support.");
          }
        } catch (err) {
          console.error(err);
          alert("Network error. Please contact support.");
        } finally {
          setLoading(false);
        }
      },
      onClose: () => {
        alert("Payment cancelled. Your application has not been submitted.");
      }
    });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 animation-fade-in">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Application Successful!</h2>
          <p className="text-slate-500 mb-6">Thank you for applying to Ditmur Academy. We have received your application fee and details.</p>
          
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl mb-8">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Application ID</p>
            <p className="text-lg font-mono font-black text-[#0033A0]">{applicationId}</p>
          </div>

          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-md p-1 border-2 border-[#0033A0]">
             <img src="/logo.jpg" alt="Ditmur Logo" className="w-[85%] h-[85%] object-contain rounded-full" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Ditmur Academy</h1>
          <p className="text-[#0033A0] mt-1 text-sm font-bold uppercase tracking-widest">2025/2026 Admissions Portal</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          
          <div className="bg-[#0A192F] p-6 text-white flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl"><ShieldCheck className="w-6 h-6 text-[#FFD700]" /></div>
            <div>
              <h2 className="text-lg font-bold">Online Application Form</h2>
              <p className="text-sm text-blue-200">A non-refundable application fee of ₦5,000 is required to complete this submission.</p>
            </div>
          </div>

          <form onSubmit={handleApply} className="p-8 space-y-8">
            
            {/* Student Details */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">
                <GraduationCap className="w-5 h-5 text-[#0033A0]" /> Student Information
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">First Name</label>
                  <input type="text" required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0033A0] outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Last Name</label>
                  <input type="text" required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0033A0] outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Date of Birth</label>
                  <input type="date" required value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0033A0] outline-none text-slate-700" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Gender</label>
                  <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0033A0] outline-none text-slate-700 font-medium">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Previous School Attended (Optional)</label>
                  <input type="text" value={formData.previousSchool} onChange={e => setFormData({...formData, previousSchool: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0033A0] outline-none" placeholder="e.g. Genesis International School" />
                </div>
              </div>
            </div>

            {/* Parent Details */}
            <div className="space-y-4 pt-4">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">
                <Users className="w-5 h-5 text-[#0033A0]" /> Parent / Guardian Information
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" required value={formData.parentName} onChange={e => setFormData({...formData, parentName: e.target.value})} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0033A0] outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0033A0] outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0033A0] outline-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-[#0033A0] to-[#002277] hover:from-[#002277] hover:to-[#0A192F] text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Pay Application Fee (₦5,000)'}
                {!loading && <ArrowRight className="w-5 h-5" />}
              </button>
              <p className="text-center text-xs text-slate-500 mt-4 flex items-center justify-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" /> Secured by Paystack
              </p>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
