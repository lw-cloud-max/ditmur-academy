"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePaystackPayment } from 'react-paystack';
import { 
  CreditCard, Search, Filter, ArrowUpRight, ArrowDownRight, 
  Wallet, Receipt, CheckCircle2, Clock, Plus, Loader2, X, Landmark, Copy
} from 'lucide-react';

function PayInvoiceButton({ invoice, email, onPaid }: { invoice: any; email: string; onPaid: () => void }) {
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_KEY;
  const [reference] = useState(() => `DITMUR-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  // Hooks must run at component level, never from a click handler.
  const initializePayment = usePaystackPayment({
    reference, email: email || 'missing@ditmur.invalid', amount: invoice.amount * 100,
    publicKey: publicKey || 'pk_test_unconfigured'
  });
  return <button type="button" disabled={!publicKey || !email}
    title={!publicKey ? 'Online payments are not configured' : !email ? 'A registered email is required to pay online' : undefined}
    onClick={() => initializePayment({
      onSuccess: async (response: any) => {
        try {
          const res = await fetch('/api/payments/verify', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference: response.reference, invoiceId: invoice.id })
          });
          const data = await res.json();
          if (!res.ok || !data.success) throw new Error(data.error || 'Payment verification failed');
          alert('Payment verified. Invoice marked as paid.');
          onPaid();
        } catch (error) { alert(error instanceof Error ? error.message : 'Payment verification failed'); }
      },
      onClose: () => {}
    })}
    className="text-white bg-emerald-600 hover:bg-emerald-700 text-xs font-bold transition-colors px-4 py-2 rounded-lg shadow-sm disabled:opacity-50">
      {!publicKey ? 'Online Unavailable' : !email ? 'Email Required' : 'Pay Online'}
  </button>;
}

export default function PaymentsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const userRole = session?.user?.role;
  const canSeeFinance = (userRole === 'ADMIN' && session?.user?.id === 'admin-1') || userRole === 'ACCOUNTANT' || (userRole === 'STAFF' && session?.user?.staffRole === 'ACCOUNTANT_TEACHER');
  const isReadOnly = !canSeeFinance;
  const canSeeOwnFees = userRole === 'PARENT' || userRole === 'STUDENT';
  const paystackEnabled = process.env.NEXT_PUBLIC_PAYSTACK_ENABLED === 'true';
  const [bankDetails, setBankDetails] = useState<{ bankName: string; accountName: string; accountNumber: string } | null>(null);
  const [bankError, setBankError] = useState('');
  const [copiedAccount, setCopiedAccount] = useState(false);

  const [invoices, setInvoices] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New Invoice Form State
  const [formData, setFormData] = useState({
    studentId: '',
    description: 'Term 1 Tuition Fee',
    amount: '',
    status: 'PENDING',
    dueDate: ''
  });

  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingFees: 0,
    overdueFees: 0,
    pendingCount: 0
  });

  useEffect(() => {
    if (sessionStatus === 'authenticated' && (canSeeFinance || canSeeOwnFees)) fetchData();
  }, [statusFilter, sessionStatus, userRole, session?.user?.id]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated' || userRole !== 'PARENT') return;
    let active = true;
    fetch('/api/payment-instructions', { cache: 'no-store' })
      .then(async res => {
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Could not load transfer details');
        if (active) setBankDetails(data.data);
      })
      .catch(error => { if (active) setBankError(error instanceof Error ? error.message : 'Could not load transfer details'); });
    return () => { active = false; };
  }, [sessionStatus, userRole]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const url = statusFilter ? `/api/payments?status=${statusFilter}` : '/api/payments';
      const invRes = await fetch(url);
      const invData = await invRes.json();
      if (invData.success) {
        setInvoices(invData.data);
        calculateStats(invData.data);
      }
      if (canSeeFinance) {
        const stuRes = await fetch('/api/students');
        const stuData = await stuRes.json();
        if (stuData.success) setStudents(stuData.data);
      }
    } catch (err) {
      console.error("Failed to load payments data");
    } finally { setLoading(false); }
  };

  const copyAccountNumber = async () => {
    if (!bankDetails) return;
    try {
      await navigator.clipboard.writeText(bankDetails.accountNumber);
      setCopiedAccount(true);
    } catch {
      setBankError('Copy was unavailable. You can select and copy the account number manually.');
    }
  };

  const calculateStats = (data: any[]) => {
    let revenue = 0; let pending = 0; let overdue = 0; let pCount = 0;
    data.forEach(inv => {
      if (inv.status === 'PAID') revenue += inv.amount;
      if (inv.status === 'PENDING') { pending += inv.amount; pCount++; }
      if (inv.status === 'OVERDUE') overdue += inv.amount;
    });
    setStats({ totalRevenue: revenue, pendingFees: pending, overdueFees: overdue, pendingCount: pCount });
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      const res = await fetch('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setFormData({ studentId: '', description: 'Term 1 Tuition Fee', amount: '', status: 'PENDING', dueDate: '' });
        fetchData();
      } else alert(data.error);
    } catch (err) { alert("Failed to create invoice"); } finally { setIsSubmitting(false); }
  };

  const handleRecordPayment = async (invoiceId: string) => {
    if (!confirm("Are you sure you want to mark this invoice as PAID?")) return;
    try {
      const res = await fetch('/api/payments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invoiceId, status: 'PAID' }) });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (err) { console.error("Failed to record payment"); }
  };


  if (sessionStatus === 'loading') return <div className="p-10 text-slate-600">Loading...</div>;
  if (!canSeeFinance && !canSeeOwnFees) return <div className="p-10 text-slate-700">School finance is only available to the super admin and accountant.</div>;

  return (
    <div className="space-y-6 pb-32 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments & Fees</h1>
          <p className="text-slate-500">{isReadOnly ? userRole === 'PARENT' ? 'View your children’s invoices and pay by school bank transfer.' : 'View your fee information.' : 'Track tuition payments, issue invoices, and manage school revenue.'}</p>
        </div>
        {!isReadOnly && (
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-[#0033A0] text-white px-4 py-2 rounded-lg hover:bg-[#002277] transition-colors font-medium text-sm">
            <Plus className="w-4 h-4" /> Create New Invoice
          </button>
        )}
      </div>

      {userRole === 'PARENT' && (
        <section aria-labelledby="bank-transfer-title" className="rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Landmark className="w-6 h-6 text-[#0033A0]" />
            <h2 id="bank-transfer-title" className="text-lg font-bold text-slate-900">Pay by bank transfer</h2>
          </div>
          {bankDetails ? <>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <div className="rounded-xl bg-white p-3 border border-blue-100"><dt className="text-xs text-slate-500 font-bold uppercase">Bank</dt><dd className="font-bold text-slate-900 break-words mt-1">{bankDetails.bankName}</dd></div>
              <div className="rounded-xl bg-white p-3 border border-blue-100"><dt className="text-xs text-slate-500 font-bold uppercase">Account name</dt><dd className="font-bold text-slate-900 break-words mt-1">{bankDetails.accountName}</dd></div>
              <div className="rounded-xl bg-white p-3 border border-blue-100">
                <dt className="text-xs text-slate-500 font-bold uppercase">Account number</dt>
                <dd className="flex flex-wrap items-center justify-between gap-2 mt-1">
                  <span className="font-black text-xl tracking-wide text-[#0033A0] select-all">{bankDetails.accountNumber}</span>
                  <button type="button" onClick={copyAccountNumber} aria-label="Copy school account number"
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-[#0033A0] hover:bg-blue-100">
                    <Copy className="w-4 h-4" /> {copiedAccount ? 'Copied' : 'Copy'}
                  </button>
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-slate-700">Use the <strong>invoice ID</strong> shown below as your transfer reference. Verify the account name with the school before paying. A transfer does not mark your invoice paid automatically; the school finance team confirms it against the bank record.</p>
          </> : <p role="status" className="mt-2 text-sm text-slate-700">{bankError || 'Loading school transfer details...'}</p>}
          {bankDetails && bankError && <p role="alert" className="mt-2 text-sm text-red-700">{bankError}</p>}
        </section>
      )}

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-slate-500 mb-1">{isReadOnly ? "Total Fees Paid" : "Total Revenue Collected"}</p>
            <h3 className="text-3xl font-bold text-slate-900">₦{stats.totalRevenue.toLocaleString()}</h3>
            <div className="flex items-center gap-1 text-emerald-600 mt-2 text-sm font-medium">
              <ArrowUpRight className="w-4 h-4" />
              <span>Real-time calculation</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-slate-500 mb-1">{isReadOnly ? "Outstanding Balance" : "Pending Fees"}</p>
            <h3 className="text-3xl font-bold text-slate-900">₦{stats.pendingFees.toLocaleString()}</h3>
            <div className="flex items-center gap-1 text-amber-600 mt-2 text-sm font-medium">
              <Clock className="w-4 h-4" />
              <span>{stats.pendingCount} Invoices Awaiting Payment</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-red-50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-slate-500 mb-1">Overdue Payments</p>
            <h3 className="text-3xl font-bold text-slate-900">₦{stats.overdueFees.toLocaleString()}</h3>
            <div className="flex items-center gap-1 text-red-600 mt-2 text-sm font-medium">
              <ArrowDownRight className="w-4 h-4" />
              <span>{isReadOnly ? "Requires your attention" : "Requires immediate action"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by student name, ID, or invoice number..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-[#0033A0] outline-none transition-all" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none">
          <option value="">All Statuses</option>
          <option value="PAID">Paid</option>
          <option value="PENDING">Pending</option>
          <option value="OVERDUE">Overdue</option>
        </select>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" /></div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-900">No invoices found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student Info</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date Issued</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-[#0033A0]">{tx.id}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{tx.student?.firstName} {tx.student?.lastName}</p>
                      <p className="text-xs text-slate-500 font-mono">{tx.student?.id}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 font-medium">{tx.description}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(tx.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm font-black text-slate-900">₦{tx.amount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide ${
                        tx.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 
                        tx.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {tx.status === 'PAID' ? <CheckCircle2 className="w-3 h-3" /> : 
                        tx.status === 'PENDING' ? <Clock className="w-3 h-3" /> : null}
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {tx.status !== 'PAID' ? (
                        isReadOnly ? (
                          userRole === 'PARENT' && paystackEnabled
                            ? <PayInvoiceButton invoice={tx} email={session?.user?.email || ''} onPaid={fetchData} />
                            : <span className="text-xs text-slate-500 font-medium">{userRole === 'PARENT' ? bankDetails ? 'Use bank transfer details above' : 'Contact school office' : 'Ask your parent/guardian to pay'}</span>
                        ) : (
                          <button onClick={() => handleRecordPayment(tx.id)} className="text-[#0033A0] hover:text-white text-xs font-bold transition-colors bg-blue-50 hover:bg-[#0033A0] px-4 py-2 rounded-lg border border-blue-100">
                            Mark as Paid
                          </button>
                        )
                      ) : (
                        <button className="text-slate-500 hover:text-slate-700 text-xs font-bold transition-colors border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50">
                          View Receipt
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE INVOICE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animation-fade-in">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create New Invoice</h3>
                <p className="text-xs text-slate-500 mt-1">Generate a fee for a specific student.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleCreateInvoice} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Select Student</label>
                <select required value={formData.studentId} onChange={(e) => setFormData({...formData, studentId: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none font-medium">
                  <option value="">Choose a student...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.id})</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fee Description</label>
                <input type="text" required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none font-medium" placeholder="e.g. Term 1 Tuition" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Amount (₦)</label>
                  <input type="number" required min="0" step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none font-bold text-[#0033A0]" placeholder="150000" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Due Date</label>
                  <input type="date" required value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none font-medium" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Initial Status</label>
                <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none font-bold text-slate-700">
                  <option value="PENDING">Pending (Unpaid)</option>
                  <option value="PAID">Paid in Full</option>
                  <option value="OVERDUE">Overdue</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-sm transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-[#0033A0] hover:bg-[#002277] text-white rounded-lg font-bold text-sm transition-colors flex justify-center items-center gap-2 shadow-sm">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Issue Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
