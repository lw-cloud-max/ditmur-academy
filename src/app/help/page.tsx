"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { HelpCircle, BookOpen, MessageCircle, FileText, Search, ChevronRight, Video, Mail, PhoneCall, Plus, Loader2, Send, CheckCircle2, X } from 'lucide-react';

export default function HelpPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role || 'STAFF';
  const isParent = userRole === 'PARENT';
  const isStudent = userRole === 'STUDENT';
  const isAdmin = userRole === 'STAFF' || userRole === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'faqs' | 'tickets'>('faqs');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Ticketing State
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  
  // Create Ticket State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reply State
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const fetchTickets = async () => {
    setLoadingTickets(true);
    try {
      const url = isParent ? `/api/tickets?parentId=${session?.user?.id}` : '/api/tickets';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setTickets(data.data);
        if (activeTicket) {
          const updated = data.data.find((t: any) => t.id === activeTicket.id);
          if (updated) setActiveTicket(updated);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'tickets') fetchTickets();
  }, [activeTab]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: newSubject, message: newMessage, parentId: session?.user?.id })
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setNewSubject('');
        setNewMessage('');
        fetchTickets();
      } else alert(data.error);
    } catch (err) {
      alert("Failed to open ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: activeTicket.id, action: 'reply', message: replyText, sender: isAdmin ? 'ADMIN' : 'PARENT' })
      });
      const data = await res.json();
      if (data.success) {
        setReplyText('');
        fetchTickets();
      }
    } catch (err) {
      alert("Failed to send message");
    } finally {
      setSendingReply(false);
    }
  };

  const handleCloseTicket = async (id: string) => {
    if (!confirm("Mark this ticket as resolved?")) return;
    try {
      const res = await fetch('/api/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: id, action: 'close' })
      });
      const data = await res.json();
      if (data.success) {
        fetchTickets();
        setActiveTicket(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const adminFaqs = [
    { category: 'Admissions & Students', items: [
      { q: 'How do I generate a new Student ID?', a: 'Student IDs are automatically generated when you complete the Admissions form.' },
      { q: 'How do I assign a student to a class?', a: 'Go to Students Directory > click the 3 dots > Assign Class.' }
    ]},
    { category: 'Grading & Broadsheet', items: [
      { q: 'Why is a student missing from the Broadsheet?', a: 'Ensure they are assigned to the specific class selected in the dropdown.' },
      { q: 'How do I change CA weighting?', a: 'Go to Assessment Format in the sidebar and save your new weights.' }
    ]}
  ];

  const parentFaqs = [
    { category: 'Parent Portal & Navigation', items: [
      { q: 'How do I check my child\'s results?', a: 'Go to the "My Children" tab and click the "View Academic Results" button.' },
      { q: 'Where can I find the school timetable?', a: 'Click on "School Calendar" in the sidebar.' }
    ]},
    { category: 'Fee Payments', items: [
      { q: 'How do I pay school fees?', a: 'Navigate to "Fee Payments". Click on a pending invoice to pay securely online.' },
    ]}
  ];

  const faqs = isParent ? parentFaqs : adminFaqs;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-32 animation-fade-in">
      
      {/* Header */}
      <div className="bg-[#0A192F] rounded-3xl p-8 md:p-12 text-center relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#0033A0] rounded-full blur-3xl opacity-50 -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#FFD700] rounded-full blur-3xl opacity-10 -ml-20 -mb-20"></div>
        
        <div className="relative z-10">
          <HelpCircle className="w-12 h-12 text-[#FFD700] mx-auto mb-4" />
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-4">How can we help you today?</h1>
          
          {!isStudent && (
            <div className="flex justify-center gap-4 mt-8">
              <button 
                onClick={() => setActiveTab('faqs')}
                className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all ${activeTab === 'faqs' ? 'bg-white text-[#0033A0] shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                Help Articles & FAQs
              </button>
              <button 
                onClick={() => setActiveTab('tickets')}
                className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all ${activeTab === 'tickets' ? 'bg-white text-[#0033A0] shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                {isAdmin ? 'Support Inbox' : 'My Support Tickets'}
              </button>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'faqs' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 text-lg mb-4">Quick Guides</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors group text-left">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-[#0033A0] rounded-lg group-hover:bg-[#0033A0] group-hover:text-white transition-colors"><BookOpen className="w-4 h-4" /></div>
                    <span className="font-medium text-slate-700">{isParent ? "Parent Guide" : "Admin Onboarding"}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#0033A0]" />
                </button>
                <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors group text-left">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors"><Video className="w-4 h-4" /></div>
                    <span className="font-medium text-slate-700">Video Tutorials</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600" />
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 shadow-md p-6 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><MessageCircle className="w-24 h-24" /></div>
              <h3 className="font-bold text-lg mb-2 relative z-10">Need technical support?</h3>
              <p className="text-slate-300 text-sm mb-6 relative z-10 leading-relaxed">Our team is available to help resolve any critical system issues or bugs.</p>
              <div className="space-y-3 relative z-10">
                <a href="mailto:support@ditmur.com" className="flex items-center gap-3 bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-colors text-sm font-medium">
                  <Mail className="w-4 h-4 text-[#FFD700]" /> support@ditmur.com
                </a>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="relative mb-6">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for guides or FAQs..." 
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-xl text-slate-900 focus:border-[#0033A0] outline-none transition-all shadow-sm"
              />
            </div>
            {faqs.map((category, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-slate-900">{category.category}</h3></div>
                <div className="divide-y divide-slate-100">
                  {category.items.map((item, itemIdx) => {
                    if (searchQuery && !item.q.toLowerCase().includes(searchQuery.toLowerCase()) && !item.a.toLowerCase().includes(searchQuery.toLowerCase())) return null;
                    return (
                      <div key={itemIdx} className="p-5 hover:bg-slate-50/50 transition-colors">
                        <h4 className="font-bold text-slate-800 text-sm mb-2">{item.q}</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">{item.a}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TICKETING SYSTEM UI */}
      {activeTab === 'tickets' && !isStudent && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 h-[600px]">
          
          {/* Ticket List (Left Panel) */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-slate-800">Support Tickets</h3>
              {isParent && (
                <button onClick={() => setIsModalOpen(true)} className="p-2 bg-[#0033A0] text-white rounded-lg hover:bg-[#002277] transition-colors"><Plus className="w-4 h-4" /></button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 bg-slate-50/50">
              {loadingTickets ? (
                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
              ) : tickets.length === 0 ? (
                <div className="text-center p-8 text-sm text-slate-500">No support tickets found.</div>
              ) : (
                tickets.map(ticket => (
                  <button 
                    key={ticket.id}
                    onClick={() => setActiveTicket(ticket)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${activeTicket?.id === ticket.id ? 'bg-white border-blue-300 shadow-sm ring-1 ring-blue-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${ticket.status === 'OPEN' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{ticket.status}</span>
                      <span className="text-xs text-slate-400">{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm truncate mb-1">{ticket.subject}</h4>
                    {isAdmin && <p className="text-xs text-slate-500 truncate">From: {ticket.parent?.fullName}</p>}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Ticket Chat View (Right Panel) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
            {!activeTicket ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <MessageCircle className="w-16 h-16 text-slate-200 mb-4" />
                <h3 className="font-bold text-slate-700 text-lg">Select a ticket</h3>
                <p className="text-slate-500 text-sm mt-1">Choose a ticket from the left to view the conversation.</p>
              </div>
            ) : (
              <>
                <div className="p-6 border-b border-slate-100 bg-slate-50 shrink-0 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{activeTicket.subject}</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {isAdmin ? `Parent: ${activeTicket.parent?.fullName} (${activeTicket.parent?.email})` : `Ticket ID: ${activeTicket.id}`}
                    </p>
                  </div>
                  {isAdmin && activeTicket.status === 'OPEN' && (
                    <button onClick={() => handleCloseTicket(activeTicket.id)} className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition-colors border border-emerald-200">
                      Mark Resolved
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30">
                  {activeTicket.messages.map((msg: any) => {
                    const isOwnMessage = (isParent && msg.sender === 'PARENT') || (isAdmin && msg.sender === 'ADMIN');
                    return (
                      <div key={msg.id} className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${isOwnMessage ? 'bg-[#0033A0] text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'}`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1.5 font-medium px-1">
                          {msg.sender === 'ADMIN' ? 'School Admin' : 'Parent'} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                  {activeTicket.status === 'RESOLVED' && isParent ? (
                    <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-500 font-medium">
                      This ticket has been marked as resolved.
                    </div>
                  ) : (
                    <form onSubmit={handleReply} className="flex gap-3">
                      <input 
                        type="text" 
                        value={replyText} 
                        onChange={(e) => setReplyText(e.target.value)} 
                        placeholder="Type your reply..." 
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0033A0] outline-none text-sm"
                      />
                      <button 
                        type="submit" 
                        disabled={sendingReply || !replyText.trim()}
                        className="px-6 py-3 bg-[#0033A0] text-white rounded-xl font-bold hover:bg-[#002277] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {sendingReply ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      </button>
                    </form>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* CREATE TICKET MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animation-fade-in">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Open Support Ticket</h3>
                <p className="text-xs text-slate-500 mt-1">Our admin team will reply to you shortly.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <input type="text" required value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="e.g. Payment issue" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                <textarea required value={newMessage} onChange={e => setNewMessage(e.target.value)} rows={4} placeholder="Describe how we can help you..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0] resize-none" />
              </div>
              <button type="submit" disabled={submitting} className="w-full py-3.5 bg-[#0033A0] text-white rounded-xl font-bold hover:bg-[#002277] transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-2">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Ticket'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
