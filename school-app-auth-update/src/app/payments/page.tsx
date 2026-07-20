"use client";

import { useState } from 'react';
import { 
  CreditCard, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet,
  Receipt,
  CheckCircle2,
  Clock
} from 'lucide-react';

const mockTransactions = [
  { id: 'INV-2024-001', student: 'Alice Johnson', id_number: 'DIT/STU/001', description: 'Term 1 Tuition Fee', amount: 1500, status: 'Paid', date: 'Oct 12, 2024' },
  { id: 'INV-2024-002', student: 'Bob Smith', id_number: 'DIT/STU/002', description: 'Term 1 Tuition Fee', amount: 1500, status: 'Pending', date: 'Oct 15, 2024' },
  { id: 'INV-2024-003', student: 'Charlie Brown', id_number: 'DIT/STU/003', description: 'Hostel Accommodation', amount: 800, status: 'Paid', date: 'Oct 10, 2024' },
  { id: 'INV-2024-004', student: 'Diana Prince', id_number: 'DIT/STU/004', description: 'Term 1 Tuition Fee', amount: 1500, status: 'Overdue', date: 'Sep 30, 2024' },
  { id: 'INV-2024-005', student: 'Evan Wright', id_number: 'DIT/STU/005', description: 'School Uniform & Books', amount: 350, status: 'Paid', date: 'Oct 05, 2024' },
];

export default function PaymentsPage() {
  const [transactions] = useState(mockTransactions);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments & Fees</h1>
          <p className="text-slate-500">Track tuition payments, issue invoices, and manage school revenue.</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">
          <Receipt className="w-4 h-4" /> Record New Payment
        </button>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-slate-500 mb-1">Total Revenue (Term 1)</p>
            <h3 className="text-3xl font-bold text-slate-900">$45,200</h3>
            <div className="flex items-center gap-1 text-emerald-600 mt-2 text-sm font-medium">
              <ArrowUpRight className="w-4 h-4" />
              <span>+12.5% from last term</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-slate-500 mb-1">Pending Fees</p>
            <h3 className="text-3xl font-bold text-slate-900">$12,800</h3>
            <div className="flex items-center gap-1 text-amber-600 mt-2 text-sm font-medium">
              <Clock className="w-4 h-4" />
              <span>42 Invoices Awaiting Payment</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-red-50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-slate-500 mb-1">Overdue Payments</p>
            <h3 className="text-3xl font-bold text-slate-900">$3,450</h3>
            <div className="flex items-center gap-1 text-red-600 mt-2 text-sm font-medium">
              <ArrowDownRight className="w-4 h-4" />
              <span>Requires immediate action</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by student name, ID, or invoice number..." 
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
          />
        </div>
        <select className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
        <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">More Filters</span>
        </button>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Invoice ID</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Student Info</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Description</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Date Issued</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Amount</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{tx.id}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-900">{tx.student}</p>
                    <p className="text-xs text-slate-500">{tx.id_number}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{tx.description}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{tx.date}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">${tx.amount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      tx.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 
                      tx.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 
                      'bg-red-100 text-red-800'
                    }`}>
                      {tx.status === 'Paid' ? <CheckCircle2 className="w-3 h-3" /> : 
                       tx.status === 'Pending' ? <Clock className="w-3 h-3" /> : null}
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {tx.status !== 'Paid' ? (
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors">
                        Record Payment
                      </button>
                    ) : (
                      <button className="text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors">
                        View Receipt
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
