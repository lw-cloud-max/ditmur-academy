"use client";

import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight, Info, Plus, Loader2, Trash2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function CalendarPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isReadOnly = userRole !== 'STAFF' && userRole !== 'ADMIN';

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '', date: '', endDate: '', description: '', type: 'event'
  });

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/calendar');
      const data = await res.json();
      if (data.success) {
        setEvents(data.data.map((e: any) => ({ ...e, date: new Date(e.date) })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setFormData({ title: '', date: '', endDate: '', description: '', type: 'event' });
        fetchEvents();
      }
    } catch (err) {
      alert("Failed to create event");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      const res = await fetch(`/api/calendar?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchEvents();
    } catch (err) {
      console.error(err);
    }
  };



  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const firstDay = getFirstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  const getEventsForDate = (day: number) => {
    return events.filter(e => 
      e.date.getDate() === day && 
      e.date.getMonth() === currentMonth.getMonth() && 
      e.date.getFullYear() === currentMonth.getFullYear()
    );
  };

  const getEventColor = (type: string) => {
    switch(type) {
      case 'holiday': return 'bg-emerald-100 border-emerald-200 text-emerald-800';
      case 'exam': return 'bg-red-100 border-red-200 text-red-800';
      case 'meeting': return 'bg-amber-100 border-amber-200 text-amber-800';
      case 'event': return 'bg-purple-100 border-purple-200 text-purple-800';
      default: return 'bg-blue-100 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className="space-y-6 pb-32 max-w-6xl mx-auto animation-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">School Calendar</h1>
          <p className="text-slate-500">View upcoming school events, holidays, and examination schedules.</p>
        </div>
        {!isReadOnly && (
          <button onClick={() => setIsModalOpen(true)} className="bg-[#0033A0] text-white px-4 py-2 rounded-lg hover:bg-[#002277] font-medium text-sm flex items-center gap-2 shadow-sm">
            <Plus className="w-4 h-4" /> Add Event
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Main Calendar View */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Calendar Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h2 className="text-xl font-black text-[#0033A0]">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h2>
            <div className="flex gap-2">
              <button onClick={prevMonth} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"><ChevronLeft className="w-5 h-5 text-slate-600" /></button>
              <button onClick={nextMonth} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"><ChevronRight className="w-5 h-5 text-slate-600" /></button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="p-6">
            <div className="grid grid-cols-7 gap-4 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center font-bold text-slate-500 text-sm">{day}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-4">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="h-24 rounded-xl bg-slate-50/50 border border-transparent"></div>
              ))}
              
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayEvents = getEventsForDate(day);
                const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonth.getMonth() && new Date().getFullYear() === currentMonth.getFullYear();

                return (
                  <div key={day} className={`h-28 rounded-xl border p-2 flex flex-col transition-all ${isToday ? 'border-blue-500 bg-blue-50/30 shadow-sm ring-1 ring-blue-500' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}>
                    <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-blue-500 text-white' : 'text-slate-700'}`}>
                      {day}
                    </span>
                    
                    <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-1 relative group">
                      {dayEvents.map(evt => (
                        <div key={evt.id} className="relative">
                          <div className={`text-[10px] font-bold px-2 py-1 rounded border leading-tight truncate ${getEventColor(evt.type)}`} title={evt.title}>
                            {evt.title}
                          </div>
                          {!isReadOnly && (
                            <button onClick={() => handleDeleteEvent(evt.id)} className="absolute -top-1 -right-1 p-0.5 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 hidden lg:flex items-center justify-center shadow-sm border border-red-200">
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Events List */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-[#0033A0]" /> Legend
            </h3>
            <div className="space-y-3 text-sm font-medium">
              <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-blue-400"></span> Academic</div>
              <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-amber-400"></span> Meetings (PTA, etc.)</div>
              <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-emerald-400"></span> Holidays</div>
              <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-red-400"></span> Examinations</div>
              <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-purple-400"></span> Special Events</div>
            </div>
          </div>

          <div className="bg-[#0A192F] rounded-2xl shadow-lg p-6 text-white border border-[#112240]">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#FFD700]" /> Term Overview
            </h3>
            <div className="space-y-4">
              {events.slice(0, 4).map(evt => (
                <div key={evt.id} className="border-l-2 border-[#FFD700] pl-4 py-1">
                  <p className="text-xs text-blue-200 font-bold mb-0.5">{evt.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  <p className="font-medium text-sm leading-tight mb-1">{evt.title}</p>
                  {evt.time && <div className="flex items-center gap-1.5 text-xs text-slate-400"><Clock className="w-3 h-3" /> {evt.time}</div>}
                  {evt.location && <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5"><MapPin className="w-3 h-3" /> {evt.location}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* CREATE EVENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#0A192F]/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animation-fade-in">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Calendar Event</h3>
                <p className="text-sm text-slate-500 mt-1">Schedule an event for the entire school.</p>
              </div>
            </div>
            
            <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Event Title</label>
                <input 
                  type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input 
                    type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500" 
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date (Optional)</label>
                  <input 
                    type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500" 
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Event Type</label>
                  <select 
                    required value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                  >
                    <option value="academic">Academic</option>
                    <option value="meeting">Meeting</option>
                    <option value="holiday">Holiday</option>
                    <option value="exam">Examination</option>
                    <option value="event">Special Event</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description / Location</label>
                <input 
                  type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="e.g. 10:00 AM at School Hall"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500" 
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-[#0033A0] hover:bg-[#002277] text-white rounded-lg font-medium text-sm transition-colors flex justify-center items-center gap-2">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
