"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Video, Plus, Search, Filter, Calendar, Clock, Users, 
  ExternalLink, Loader2, X, CheckCircle2, AlertCircle
} from 'lucide-react';

interface VideoMeeting {
  id: string;
  title: string;
  description: string | null;
  meetingUrl: string;
  scheduledAt: string;
  duration: number;
  type: string;
  status: string;
  host: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  participants: any[];
}

export default function VideoMeetingsPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role || 'STAFF';
  const userId = session?.user?.id || '';
  const isParent = userRole === 'PARENT';

  const [meetings, setMeetings] = useState<VideoMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Create meeting modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState(30);
  const [meetingType, setMeetingType] = useState('PARENT_TEACHER');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const res = await fetch('/api/video-meetings');
      const data = await res.json();
      if (data.success) {
        setMeetings(data.data);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !meetingUrl || !scheduledAt || creating) return;

    setCreating(true);
    try {
      const res = await fetch('/api/video-meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          meetingUrl,
          scheduledAt,
          duration,
          type: meetingType
        })
      });

      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setTitle('');
        setDescription('');
        setMeetingUrl('');
        setScheduledAt('');
        fetchMeetings();
        alert('Meeting created successfully!');
      } else {
        alert(`Failed to create meeting: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
      alert('Failed to create meeting');
    } finally {
      setCreating(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'PARENT_TEACHER': 'Parent-Teacher Meeting',
      'CLASS': 'Virtual Class',
      'EVENT': 'School Event',
      'OFFICE_HOURS': 'Office Hours'
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-700';
      case 'ONGOING': return 'bg-emerald-100 text-emerald-700';
      case 'COMPLETED': return 'bg-slate-100 text-slate-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = 
      meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.host.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.host.lastName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'ALL' || meeting.type === filterType;
    const matchesStatus = filterStatus === 'ALL' || meeting.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-32 max-w-6xl mx-auto animation-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Video className="w-7 h-7 text-[#0033A0]" />
            Video Meetings
          </h1>
          <p className="text-slate-500 mt-1">
            {isParent ? 'Join parent-teacher meetings and school events' : 'Schedule and manage video meetings'}
          </p>
        </div>
        {!isParent && userRole !== 'STUDENT' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-[#0033A0] text-white rounded-xl font-bold hover:bg-[#002277] transition-colors flex items-center gap-2 shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            Create Meeting
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search meetings..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
            >
              <option value="ALL">All Types</option>
              <option value="PARENT_TEACHER">Parent-Teacher</option>
              <option value="CLASS">Virtual Class</option>
              <option value="EVENT">School Event</option>
              <option value="OFFICE_HOURS">Office Hours</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
            >
              <option value="ALL">All Status</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="ONGOING">Ongoing</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Meetings List */}
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" />
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-xl border border-slate-200 shadow-sm">
          <Video className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-700">No meetings found</p>
          <p className="text-sm text-slate-500 mt-1">
            {isParent ? 'No meetings scheduled yet' : 'Create your first video meeting'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMeetings.map(meeting => (
            <div key={meeting.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-slate-900 text-lg">{meeting.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getStatusColor(meeting.status)}`}>
                      {meeting.status}
                    </span>
                  </div>
                  
                  {meeting.description && (
                    <p className="text-sm text-slate-600 mb-3">{meeting.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(meeting.scheduledAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(meeting.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      <span className="text-slate-400">({meeting.duration} min)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {meeting.participants.length} participants
                    </div>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                      {getTypeLabel(meeting.type)}
                    </span>
                  </div>

                  <div className="mt-3 text-sm text-slate-500">
                    Host: <span className="font-medium text-slate-700">{meeting.host.firstName} {meeting.host.lastName}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {meeting.status === 'SCHEDULED' || meeting.status === 'ONGOING' ? (
                    <a
                      href={meeting.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 bg-[#0033A0] hover:bg-[#002277] text-white rounded-xl font-bold transition-colors flex items-center gap-2"
                    >
                      <ExternalLink className="w-5 h-5" />
                      Join Meeting
                    </a>
                  ) : meeting.status === 'COMPLETED' ? (
                    <span className="px-6 py-3 bg-slate-100 text-slate-500 rounded-xl font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" />
                      Ended
                    </span>
                  ) : (
                    <span className="px-6 py-3 bg-red-50 text-red-600 rounded-xl font-medium flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Cancelled
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animation-fade-in">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create Video Meeting</h3>
                <p className="text-xs text-slate-500 mt-1">Schedule a new video meeting</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateMeeting} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Parent-Teacher Conference"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Meeting agenda or description..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0] resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meeting URL *</label>
                <input
                  type="url"
                  required
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  placeholder="https://meet.google.com/xxx-xxxx-xxx or Zoom link"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                />
                <p className="text-xs text-slate-500 mt-1">Paste your Google Meet, Zoom, or other video conferencing link</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duration (min)</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Type *</label>
                <select
                  value={meetingType}
                  onChange={(e) => setMeetingType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                >
                  <option value="PARENT_TEACHER">Parent-Teacher Meeting</option>
                  <option value="CLASS">Virtual Class</option>
                  <option value="EVENT">School Event</option>
                  <option value="OFFICE_HOURS">Office Hours</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title || !meetingUrl || !scheduledAt || creating}
                  className="flex-1 px-4 py-3 bg-[#0033A0] text-white rounded-xl font-bold hover:bg-[#002277] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Video className="w-5 h-5" />
                      Create Meeting
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
