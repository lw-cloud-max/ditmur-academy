"use client";

import { useState, useEffect } from 'react';
import { MessageSquare, Send, Loader2, CheckCircle2, XCircle, Clock, Search, Filter, Trash2, AlertCircle } from 'lucide-react';

interface SMSNotification {
  id: string;
  type: string;
  message: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
  student?: { firstName: string; lastName: string };
  parent?: { fullName: string; phone: string };
}

export default function SMSNotificationsPage() {
  const [notifications, setNotifications] = useState<SMSNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  // Send SMS form state
  const [showSendForm, setShowSendForm] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [smsType, setSmsType] = useState('ATTENDANCE_PRESENT');
  const [customMessage, setCustomMessage] = useState('');

  useEffect(() => {
    fetchNotifications();
    fetchStudents();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/sms');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data.success) {
        setStudents(data.data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleSendSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || sending) return;

    setSending(true);
    try {
      const res = await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: smsType,
          studentId: selectedStudent,
          customMessage: customMessage || undefined
        })
      });

      const data = await res.json();
      if (data.success) {
        setShowSendForm(false);
        setSelectedStudent('');
        setCustomMessage('');
        fetchNotifications();
        alert('SMS sent successfully! (In sandbox mode, messages appear in the Africa\'s Talking simulator, not on real phones)');
      } else {
        alert(`Failed to send SMS: ${data.error}`);
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      alert('Failed to send SMS');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;

    try {
      console.log('Deleting notification:', id);
      const res = await fetch(`/api/sms?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      console.log('Delete response:', data);
      
      if (data.success) {
        fetchNotifications();
        alert('Notification deleted successfully!');
      } else {
        alert(`Failed to delete: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('Failed to delete notification. Check console for details.');
    }
  };

  const handleClearAllNotifications = async () => {
    if (!confirm('Are you sure you want to delete ALL SMS notifications? This cannot be undone.')) return;

    try {
      console.log('Clearing all notifications');
      const res = await fetch('/api/sms?deleteAll=true', { method: 'DELETE' });
      const data = await res.json();
      console.log('Clear all response:', data);
      
      if (data.success) {
        fetchNotifications();
        alert('All notifications cleared!');
      } else {
        alert(`Failed to clear: ${data.error}`);
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
      alert('Failed to clear notifications. Check console for details.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
      case 'DELIVERED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-amber-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'ATTENDANCE_PRESENT': 'Attendance (Present)',
      'ATTENDANCE_ABSENT': 'Attendance (Absent)',
      'ATTENDANCE_LATE': 'Attendance (Late)',
      'RESULT': 'Result Published',
      'FEE_REMINDER': 'Fee Reminder',
      'ANNOUNCEMENT': 'Announcement',
      'CUSTOM': 'Custom Message'
    };
    return labels[type] || type;
  };

  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = 
      n.student?.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.student?.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.parent?.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === 'ALL' || n.type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 pb-32 max-w-6xl mx-auto animation-fade-in">
      {/* Sandbox Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-amber-800">Sandbox Mode Active</p>
          <p className="text-xs text-amber-700 mt-1">
            You're using Africa's Talking sandbox. Messages are sent to the <a href="https://simulator.africastalking.com:1517/" target="_blank" rel="noopener noreferrer" className="underline font-medium">SMS Simulator</a>, not to real phones. 
            Switch to production mode when ready to send real SMS.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-[#0033A0]" />
            SMS Notifications
          </h1>
          <p className="text-slate-500 mt-1">Send automated SMS alerts to parents via Africa's Talking</p>
        </div>
        <div className="flex gap-3">
          {notifications.length > 0 && (
            <button
              onClick={handleClearAllNotifications}
              className="px-4 py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center gap-2 border border-red-200"
            >
              <Trash2 className="w-5 h-5" />
              Clear All
            </button>
          )}
          <button
            onClick={() => setShowSendForm(true)}
            className="px-6 py-3 bg-[#0033A0] text-white rounded-xl font-bold hover:bg-[#002277] transition-colors flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
            Send SMS
          </button>
        </div>
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
              placeholder="Search by student, parent, or message..."
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
              <option value="ATTENDANCE_PRESENT">Attendance (Present)</option>
              <option value="ATTENDANCE_ABSENT">Attendance (Absent)</option>
              <option value="ATTENDANCE_LATE">Attendance (Late)</option>
              <option value="RESULT">Result Published</option>
              <option value="FEE_REMINDER">Fee Reminder</option>
              <option value="ANNOUNCEMENT">Announcement</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center p-12 text-slate-500">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-medium">No SMS notifications found</p>
            <p className="text-sm mt-1">Send your first SMS to see it here</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredNotifications.map(notification => (
              <div key={notification.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(notification.status)}
                      <span className="text-xs font-bold text-slate-500 uppercase">
                        {getTypeLabel(notification.type)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        notification.status === 'SENT' || notification.status === 'DELIVERED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : notification.status === 'FAILED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {notification.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 mb-1">{notification.message}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      {notification.student && (
                        <span>Student: {notification.student.firstName} {notification.student.lastName}</span>
                      )}
                      {notification.parent && (
                        <span>Parent: {notification.parent.fullName} ({notification.parent.phone})</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-slate-400">
                      {new Date(notification.createdAt).toLocaleString()}
                    </div>
                    <button
                      onClick={() => handleDeleteNotification(notification.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete notification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Send SMS Modal */}
      {showSendForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animation-fade-in">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Send SMS Notification</h3>
              <p className="text-xs text-slate-500 mt-1">Send an SMS alert to a student's parent via Africa's Talking</p>
            </div>
            
            <form onSubmit={handleSendSMS} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Student *</label>
                <select
                  required
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                >
                  <option value="">Choose a student...</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.firstName} {student.lastName} ({student.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SMS Type *</label>
                <select
                  value={smsType}
                  onChange={(e) => setSmsType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
                >
                  <option value="ATTENDANCE_PRESENT">Attendance - Present</option>
                  <option value="ATTENDANCE_ABSENT">Attendance - Absent</option>
                  <option value="ATTENDANCE_LATE">Attendance - Late</option>
                  <option value="RESULT">Result Published</option>
                  <option value="FEE_REMINDER">Fee Reminder</option>
                  <option value="ANNOUNCEMENT">Announcement</option>
                  <option value="CUSTOM">Custom Message</option>
                </select>
              </div>

              {(smsType === 'CUSTOM' || smsType === 'ANNOUNCEMENT' || smsType === 'FEE_REMINDER') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {smsType === 'FEE_REMINDER' ? 'Amount (₦)' : 'Message'} *
                  </label>
                  <textarea
                    required
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={3}
                    placeholder={smsType === 'FEE_REMINDER' ? 'Enter amount...' : 'Enter your message...'}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0] resize-none"
                  />
                </div>
              )}

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> In sandbox mode, SMS will be sent to the <a href="https://simulator.africastalking.com:1517/" target="_blank" rel="noopener noreferrer" className="underline font-medium">Africa's Talking Simulator</a>, not to real phones.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSendForm(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedStudent || sending}
                  className="flex-1 px-4 py-3 bg-[#0033A0] text-white rounded-xl font-bold hover:bg-[#002277] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send SMS
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
