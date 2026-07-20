"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Send, Users, Smartphone, Mail, AlertCircle, CheckCircle2, Loader2, MessageSquareText, History, Sparkles } from 'lucide-react';

export default function MessagingPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isReadOnly = userRole !== 'STAFF' && userRole !== 'ADMIN';

  const [activeTab, setActiveTab] = useState('compose');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  
  const [formData, setFormData] = useState({
    audience: 'all_parents',
    type: 'email',
    subject: '',
    message: ''
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage('');

    try {
      const res = await fetch('/api/messaging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message);
        setFormData({ ...formData, subject: '', message: '' }); 
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt) {
      alert("Please enter a short prompt for the AI to expand on!");
      return;
    }
    
    setIsGeneratingAI(true);
    try {
      const res = await fetch('/api/ai/messaging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const data = await res.json();
      
      if (data.success) {
        setFormData({
          ...formData,
          subject: data.data.subject,
          message: data.data.message
        });
        setAiPrompt('');
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("AI Generation failed.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const getCharCount = () => formData.message.length;
  const getSmsCount = () => Math.ceil(Math.max(1, formData.message.length / 160));

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-32">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Broadcast Messaging</h1>
        <p className="text-slate-500">Send bulk SMS or Emails to parents, students, and staff.</p>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        <button onClick={() => setActiveTab('compose')} className={`pb-4 px-2 text-sm font-bold transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'compose' ? 'border-[#0033A0] text-[#0033A0]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          <MessageSquareText className="w-4 h-4" /> Compose Broadcast
        </button>
        <button onClick={() => setActiveTab('history')} className={`pb-4 px-2 text-sm font-bold transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'history' ? 'border-[#0033A0] text-[#0033A0]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          <History className="w-4 h-4" /> Message History
        </button>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center gap-3 animation-fade-in">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {activeTab === 'compose' && !isReadOnly && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-[#0033A0]" /> Target Audience</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                  <input type="radio" checked={formData.audience === 'all_parents'} onChange={() => setFormData({...formData, audience: 'all_parents'})} className="text-[#0033A0] w-4 h-4" />
                  <span className="text-sm font-medium text-slate-700">All Parents</span>
                </label>
                <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                  <input type="radio" checked={formData.audience === 'all_staff'} onChange={() => setFormData({...formData, audience: 'all_staff'})} className="text-[#0033A0] w-4 h-4" />
                  <span className="text-sm font-medium text-slate-700">All Staff</span>
                </label>
                <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                  <input type="radio" checked={formData.audience === 'specific_class'} onChange={() => setFormData({...formData, audience: 'specific_class'})} className="text-[#0033A0] w-4 h-4" />
                  <span className="text-sm font-medium text-slate-700">Specific Class Parents</span>
                </label>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Send className="w-4 h-4 text-emerald-600" /> Delivery Method</h3>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setFormData({...formData, type: 'email'})} className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 ${formData.type === 'email' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  <Mail className="w-6 h-6" /><span className="text-sm font-bold">Email</span>
                </button>
                <button type="button" onClick={() => setFormData({...formData, type: 'sms'})} className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 ${formData.type === 'sms' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  <Smartphone className="w-6 h-6" /><span className="text-sm font-bold">SMS</span>
                </button>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 leading-relaxed font-medium">Broadcast messages are sent instantly. Please ensure your message is proofread before clicking send.</p>
            </div>
          </div>

          <div className="lg:col-span-2">
            <form onSubmit={handleSendMessage} className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col relative overflow-hidden">
              
              {/* AI Overlay */}
              {isGeneratingAI && (
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                  <Sparkles className="w-12 h-12 text-indigo-600 animate-pulse mb-3" />
                  <h3 className="text-xl font-black text-indigo-900">AI is drafting message...</h3>
                </div>
              )}

              {/* AI Prompt Box */}
              <div className="mb-6 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Sparkles className="w-4 h-4"/> AI Assistant</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    placeholder="Tell AI what you want to say (e.g. 'Remind parents about midterm break tomorrow')" 
                    className="flex-1 px-4 py-2 bg-white border border-indigo-200 rounded-lg text-sm outline-none focus:border-indigo-400"
                  />
                  <button type="button" onClick={handleGenerateAI} disabled={isGeneratingAI || !aiPrompt} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50">Generate</button>
                </div>
              </div>

              {formData.type === 'email' && (
                <div className="mb-4">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Subject Line</label>
                  <input type="text" required value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-[#0033A0] outline-none font-medium" />
                </div>
              )}

              <div className="flex-1 flex flex-col mb-6">
                <div className="flex justify-between items-end mb-1">
                  <label className="block text-sm font-bold text-slate-700">Message Content</label>
                  {formData.type === 'sms' && <span className="text-xs font-medium text-slate-500">{getCharCount()} chars | {getSmsCount()} SMS credit(s)</span>}
                </div>
                <textarea required value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} className="w-full flex-1 min-h-[250px] px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-[#0033A0] outline-none resize-none leading-relaxed" />
              </div>

              <button type="submit" disabled={isSubmitting || formData.message.trim() === ''} className={`w-full py-3.5 rounded-lg font-bold text-white transition-colors flex items-center justify-center gap-2 ${isSubmitting || formData.message.trim() === '' ? 'bg-[#0033A0]/50 cursor-not-allowed' : 'bg-[#0033A0] hover:bg-[#002277]'}`}>
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} {isSubmitting ? 'Sending...' : `Send Broadcast`}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'compose' && isReadOnly && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <MessageSquareText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900 mb-1">Direct Messaging Not Available</h3>
          <p className="text-slate-500 text-sm">Please contact the school administration directly via phone or email for inquiries.</p>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900 mb-1">Message History Empty</h3>
          <p className="text-slate-500 text-sm">Your sent messages will appear here.</p>
        </div>
      )}
    </div>
  );
}
