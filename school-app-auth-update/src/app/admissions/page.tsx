"use client";

import { useState } from 'react';
import { User, Users, BookOpen, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';

export default function AdmissionsPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Student Details
    firstName: '',
    lastName: '',
    dob: '',
    gender: '',
    // Parent Details
    parentName: '',
    email: '',
    phone: '',
    // Academic History
    previousSchool: '',
    applyingForGrade: '',
  });

  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Admission form submitted successfully!');
    // Here we will eventually send the data to our database
    setStep(1);
    setFormData({
      firstName: '', lastName: '', dob: '', gender: '',
      parentName: '', email: '', phone: '',
      previousSchool: '', applyingForGrade: '',
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Admission</h1>
        <p className="text-slate-500">Process a new student application.</p>
      </div>

      {/* Progress Steps */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
        {[
          { num: 1, title: 'Student Info', icon: User },
          { num: 2, title: 'Parent Info', icon: Users },
          { num: 3, title: 'Academic', icon: BookOpen }
        ].map((s, i) => (
          <div key={s.num} className="flex items-center flex-1 last:flex-none">
            <div className={`flex items-center gap-2 ${step >= s.num ? 'text-blue-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                step >= s.num ? 'border-blue-600 bg-blue-50' : 'border-slate-300'
              }`}>
                {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
              </div>
              <span className="font-medium text-sm hidden sm:block">{s.title}</span>
            </div>
            {i < 2 && <div className={`flex-1 h-0.5 mx-4 ${step > s.num ? 'bg-blue-600' : 'bg-slate-200'}`} />}
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
                    <option value="male">Male</option>
                    <option value="female">Female</option>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Applying For Grade/Class</label>
                  <select required value={formData.applyingForGrade} onChange={e => updateForm('applyingForGrade', e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">Select a Grade...</option>
                    <option value="grade_7">Grade 7 (JSS 1)</option>
                    <option value="grade_8">Grade 8 (JSS 2)</option>
                    <option value="grade_9">Grade 9 (JSS 3)</option>
                    <option value="grade_10">Grade 10 (SS 1)</option>
                    <option value="grade_11">Grade 11 (SS 2)</option>
                    <option value="grade_12">Grade 12 (SS 3)</option>
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
              disabled={step === 1}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-colors ${
                step === 1 ? 'text-slate-400 bg-slate-100 cursor-not-allowed' : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(s => Math.min(3, s + 1))}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Next Step <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                className="flex items-center gap-2 px-8 py-2.5 rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" /> Submit Application
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
