"use client";

import { useState, useEffect } from 'react';
import { User, Users, BookOpen, CheckCircle2, ChevronRight, ChevronLeft, Loader2, AlertCircle } from 'lucide-react';

export default function AdmissionsPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [classes, setClasses] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', dob: '', gender: '',
    parentName: '', email: '', phone: '',
    previousSchool: '', classId: '',
  });

  // Fetch real classes for the dropdown
  useEffect(() => {
    fetch('/api/classes')
      .then(res => res.json())
      .then(data => {
        if (data.success) setClasses(data.data);
      })
      .catch(err => console.error("Failed to fetch classes", err));
  }, []);

  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/admissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit form');
      }

      setSuccessMessage(`Admission successful! Student ID generated: ${data.studentId}`);
      
      setStep(1);
      setFormData({
        firstName: '', lastName: '', dob: '', gender: '',
        parentName: '', email: '', phone: '',
        previousSchool: '', classId: '',
      });

    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Admission</h1>
        <p className="text-slate-500">Process a new student application and assign them to a class.</p>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-2 font-medium">
          <AlertCircle className="w-5 h-5" /> {errorMessage}
        </div>
      )}

      {/* Progress Steps */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
        {[
          { num: 1, title: 'Student Info', icon: User },
          { num: 2, title: 'Parent Info', icon: Users },
          { num: 3, title: 'Academic', icon: BookOpen }
        ].map((s, i) => (
          <div key={s.num} className="flex items-center flex-1 last:flex-none">
            <div className={`flex items-center gap-2 ${step >= s.num ? 'text-[#0033A0]' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                step >= s.num ? 'border-[#0033A0] bg-blue-50' : 'border-slate-300'
              }`}>
                {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
              </div>
              <span className="font-medium text-sm hidden sm:block">{s.title}</span>
            </div>
            {i < 2 && <div className={`flex-1 h-0.5 mx-4 ${step > s.num ? 'bg-[#0033A0]' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      {/* Form Area */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <form onSubmit={submitForm}>
          
          {/* STEP 1: Student Details */}
          {step === 1 && (
            <div className="space-y-4 animation-fade-in">
              <h2 className="text-xl font-bold text-slate-800 mb-6">Student Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                  <input type="text" required value={formData.firstName} onChange={e => updateForm('firstName', e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. John" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                  <input type="text" required value={formData.lastName} onChange={e => updateForm('lastName', e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                  <input type="date" required value={formData.dob} onChange={e => updateForm('dob', e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                  <select required value={formData.gender} onChange={e => updateForm('gender', e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">Select Gender...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Parent Details */}
          {step === 2 && (
            <div className="space-y-4 animation-fade-in">
              <h2 className="text-xl font-bold text-slate-800 mb-6">Parent / Guardian Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input type="text" required value={formData.parentName} onChange={e => updateForm('parentName', e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Jane Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <input type="email" required value={formData.email} onChange={e => updateForm('email', e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. jane@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                  <input type="tel" required value={formData.phone} onChange={e => updateForm('phone', e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="+1 234 567 8900" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Academic History */}
          {step === 3 && (
            <div className="space-y-4 animation-fade-in">
              <h2 className="text-xl font-bold text-slate-800 mb-6">Academic History</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Previous School Attended</label>
                  <input type="text" required value={formData.previousSchool} onChange={e => updateForm('previousSchool', e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Name of previous school" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Assign to Class</label>
                  <select required value={formData.classId} onChange={e => updateForm('classId', e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">Select a Class...</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between">
            <button
              type="button"
              onClick={() => setStep(s => Math.max(1, s - 1))}
              disabled={step === 1 || loading}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-colors ${
                step === 1 || loading ? 'text-slate-400 bg-slate-100 cursor-not-allowed' : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(s => Math.min(3, s + 1))}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium bg-[#0033A0] text-white hover:bg-[#002277] transition-colors"
              >
                Next Step <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className={`flex items-center gap-2 px-8 py-2.5 rounded-lg font-medium text-white transition-colors shadow-sm ${
                  loading ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {loading ? 'Processing...' : 'Submit Application'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
