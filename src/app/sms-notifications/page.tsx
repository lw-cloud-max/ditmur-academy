"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AlertCircle, Clock, Loader2, MessageSquare, Send, ShieldCheck } from 'lucide-react';
import { SMS_TEMPLATES } from '@/lib/sms-templates';

type Config = { mode: 'disabled' | 'sandbox' | 'live'; enabled: boolean; reason: string; senderId?: string };
type Notice = { id: string; type: string; message: string; status: string; createdAt: string;
  parent?: { fullName: string; phone: string }; student?: { firstName: string; lastName: string } };
type Student = { id: string; firstName: string; lastName: string; parent?: { phone?: string } };
const TYPES = [
  ['CUSTOM', 'Custom Message'], ['ATTENDANCE_PRESENT', 'Attendance: Present'],
  ['ATTENDANCE_ABSENT', 'Attendance: Absent'], ['ATTENDANCE_LATE', 'Attendance: Late'],
  ['RESULT', 'Approved Report Notice'], ['FEE_REMINDER', 'Fee Invoice Reminder'],
  ['ANNOUNCEMENT', 'School Announcement']
] as const;

export default function SMSNotificationsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const superAdmin = session?.user?.role === 'ADMIN' && session?.user?.id === 'admin-1';
  const [config, setConfig] = useState<Config | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [terms, setTerms] = useState<string[]>(['Term 1 - 2024']);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [studentId, setStudentId] = useState('');
  const [type, setType] = useState('CUSTOM');
  const [customMessage, setCustomMessage] = useState('');
  const [term, setTerm] = useState('Term 1 - 2024');
  const [consentChecked, setConsentChecked] = useState(false);
  const [search, setSearch] = useState('');

  const refreshHistory = async () => {
    const res = await fetch('/api/sms', { cache: 'no-store' });
    const json = await res.json();
    if (res.ok && json.success) setNotices(json.data);
  };

  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !superAdmin) return;
    Promise.all([
      fetch('/api/sms?config=1', { cache: 'no-store' }).then(res => res.json()),
      fetch('/api/sms', { cache: 'no-store' }).then(res => res.json()),
      fetch('/api/students').then(res => res.json()),
      fetch('/api/terms').then(res => res.json())
    ]).then(([settings, history, enrolled, schoolTerms]) => {
      if (settings.success) setConfig(settings.data);
      else setError(settings.error || 'Could not check SMS configuration');
      if (history.success) setNotices(history.data);
      if (enrolled.success) setStudents(enrolled.data);
      if (schoolTerms.success) {
        const options = schoolTerms.data.map((item: { name: string; session: string }) => `${item.name} ${item.session}`);
        setTerms(Array.from(new Set(['Term 1 - 2024', ...options])));
      }
    }).catch(() => setError('Could not load SMS settings. Check your connection.'))
      .finally(() => setLoading(false));
  }, [sessionStatus, superAdmin]);

  const selected = students.find(student => student.id === studentId);
  const studentName = selected ? `${selected.firstName} ${selected.lastName}` : 'this student';
  const today = new Date().toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos' });
  const preview = type === 'CUSTOM' ? customMessage.trim()
    : type === 'ANNOUNCEMENT' ? SMS_TEMPLATES.announcement(customMessage.trim())
    : type === 'ATTENDANCE_PRESENT' ? SMS_TEMPLATES.attendancePresent(studentName, today)
    : type === 'ATTENDANCE_ABSENT' ? SMS_TEMPLATES.attendanceAbsent(studentName, today, false)
    : type === 'ATTENDANCE_LATE' ? SMS_TEMPLATES.attendanceLate(studentName, today)
    : type === 'RESULT' ? SMS_TEMPLATES.resultPublished(term)
    : SMS_TEMPLATES.feeReminder();
  const maskedPhone = selected?.parent?.phone ? `***${selected.parent.phone.slice(-4)}` : 'No parent phone';

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!config?.enabled || !studentId || !consentChecked || sending || !preview || preview.length > 320) return;
    if (!window.confirm(`Send ONE ${config.mode === 'live' ? 'billable LIVE' : 'sandbox'} SMS to the parent of ${studentName} (${maskedPhone})?\n\n${preview}\n\nProvider acceptance is NOT proof the phone received it.`)) return;
    setSending(true); setError(''); setMessage('');
    try {
      const res = await fetch('/api/sms', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, studentId, customMessage, term, confirmed: true }) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'SMS was not accepted. Check history before retrying.');
      setMessage(json.message || 'Accepted by provider. Delivery has not yet been confirmed.');
      setConsentChecked(false); setCustomMessage(''); setStudentId('');
      await refreshHistory();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'SMS outcome unknown. Check provider logs before retrying.'); }
    finally { setSending(false); }
  };

  if (sessionStatus === 'loading') return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-700" /></div>;
  if (!superAdmin) return <div className="max-w-3xl mx-auto p-6 bg-white border rounded-xl text-slate-700">Only the super admin can manage school SMS.</div>;
  const filtered = notices.filter(row => `${row.student?.firstName || ''} ${row.student?.lastName || ''} ${row.parent?.fullName || ''} ${row.message}`.toLowerCase().includes(search.toLowerCase()));

  return <div className="max-w-5xl mx-auto pb-32 space-y-6">
    <header><h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><MessageSquare className="text-blue-700" /> SMS Notifications</h1>
      <p className="text-slate-600 mt-1 text-sm">One parent at a time. No automatic or bulk SMS is enabled.</p></header>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">{message}</p>}
    <section aria-label="SMS mode" className={`rounded-xl border p-4 flex items-start gap-3 ${config?.mode === 'live' && config.enabled ? 'bg-amber-50 border-amber-300' : 'bg-blue-50 border-blue-200'}`}>
      <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0" />
      <div><h2 className="font-bold">{loading ? 'Checking SMS mode...' : config?.enabled ? config.mode === 'sandbox' ? 'Sandbox simulator active' : 'Live SMS enabled - charges may apply' : 'SMS sending disabled (safe for launch)'}</h2>
        <p className="text-sm mt-1">{config?.reason || 'SMS settings have not been loaded. No messages can be sent.'}</p>
        {config?.mode === 'live' && config.senderId && <p className="text-sm mt-1">Approved sender ID configured: {config.senderId}</p>}
        <p className="text-xs mt-2">"Accepted" means the provider received the request. Handset delivery requires a separate delivery report.</p>
      </div>
    </section>

    {config?.enabled && <form onSubmit={send} className="rounded-2xl border bg-white p-4 sm:p-6 space-y-4">
      <h2 className="font-bold text-lg">Compose a single-parent SMS</h2>
      <label className="block text-sm font-semibold">Student (message goes to linked parent)
        <select required value={studentId} onChange={event => setStudentId(event.target.value)} className="block mt-1 w-full rounded-lg border p-3 bg-white">
          <option value="">Select student</option>{students.map(student => <option key={student.id} value={student.id}>{student.firstName} {student.lastName} ({student.id})</option>)}
        </select>
      </label>
      {selected && <p className="text-sm text-slate-600">Parent phone: {maskedPhone}</p>}
      <label className="block text-sm font-semibold">Message type
        <select value={type} onChange={event => setType(event.target.value)} className="block mt-1 w-full rounded-lg border p-3 bg-white">
          {TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      {type === 'RESULT' && <label className="block text-sm font-semibold">Approved class and term
        <select value={term} onChange={event => setTerm(event.target.value)} className="block mt-1 w-full rounded-lg border p-3 bg-white">
          {terms.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>}
      {(type === 'CUSTOM' || type === 'ANNOUNCEMENT') && <label className="block text-sm font-semibold">Message
        <textarea required maxLength={260} value={customMessage} onChange={event => setCustomMessage(event.target.value)} rows={3}
          className="block mt-1 w-full rounded-lg border p-3" placeholder="Write a short, school-approved message" />
      </label>}
      <div className="rounded-xl border bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">Message preview</p>
        <p className="whitespace-pre-wrap text-sm mt-2 text-slate-800">{preview || 'Write a message above.'}</p>
        <p className="text-xs text-slate-500 mt-2">{preview.length}/320 characters. Longer messages may incur more than one SMS charge.</p>
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" checked={consentChecked} onChange={event => setConsentChecked(event.target.checked)} className="mt-1" />
        I have reviewed this exact message and have school authorisation and recipient consent to send to this one parent.
      </label>
      <button type="submit" disabled={!studentId || !consentChecked || !preview || preview.length > 320 || sending}
        className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-blue-800 px-6 py-3 font-bold text-white disabled:opacity-50">
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {config.mode === 'live' ? 'Review and send LIVE SMS' : 'Review and send to simulator'}
      </button>
    </form>}

    <section className="rounded-2xl border bg-white overflow-hidden">
      <div className="p-4 border-b flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">SMS attempts</h2>
        <label className="text-sm">Search history <input value={search} onChange={event => setSearch(event.target.value)} className="ml-2 rounded-lg border p-2" /></label>
      </div>
      {loading ? <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-700" /></div> : filtered.length === 0 ? <p className="p-6 text-slate-500 text-sm">No SMS attempts recorded yet.</p> :
        <ul className="divide-y">{filtered.map(row => <li key={row.id} className="p-4 flex flex-col sm:flex-row justify-between gap-3">
          <div><span className={`text-xs font-bold px-2 py-1 rounded ${row.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : row.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
              {row.status === 'ACCEPTED' || row.status === 'SENT' ? 'ACCEPTED (delivery unconfirmed)' : row.status}
            </span>
            <span className="ml-2 text-xs text-slate-500">{row.type}</span>
            <p className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">{row.message}</p>
            <p className="mt-1 text-xs text-slate-500">{row.student?.firstName} {row.student?.lastName} / {row.parent?.fullName} ({row.parent?.phone ? `***${row.parent.phone.slice(-4)}` : 'no phone'})</p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs text-slate-500 shrink-0"><Clock className="w-3 h-3" />{new Date(row.createdAt).toLocaleString()}</span>
        </li>)}</ul>}
    </section>
  </div>;
}
