import Link from 'next/link';
import { ArrowLeft, Mail, Phone, ShieldCheck } from 'lucide-react';

// Online paid admissions are intentionally closed until payment verification
// and school fee terms are explicitly configured and tested.
export default function AdmissionsEnquiryPage() {
  return <main className="min-h-screen bg-slate-50 px-4 py-10 sm:py-16">
    <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-9 shadow-lg">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-blue-900 hover:underline"><ArrowLeft size={16} /> Back to Ditmur Academy</Link>
      <div className="mt-8 flex items-center gap-3"><img src="/logo.jpg" alt="Ditmur Academy" className="h-14 w-14 object-contain" /><div><p className="text-xs font-bold uppercase tracking-widest text-blue-800">Crèche · Primary · Secondary</p><h1 className="font-serif text-2xl font-black text-[#0A192F]">Admissions enquiries</h1></div></div>
      <p className="mt-6 text-slate-700 leading-relaxed">Thank you for your interest in Ditmur Academy. Please contact the school to ask about current places, admission steps and any applicable fees.</p>
      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 flex gap-2"><ShieldCheck className="h-5 w-5 shrink-0" /><p><strong>Online application payments are not active.</strong> Do not make a payment through this website. The school will provide official instructions directly.</p></div>
      <div className="mt-7 grid gap-3">
        <a href="mailto:ditmuracademy@gmail.com?subject=Admissions%20enquiry" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 font-bold text-white hover:bg-[#002277]"><Mail size={18} /> Email admissions</a>
        <a href="tel:+2348038164705" className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-blue-200 px-4 font-bold text-blue-900 hover:bg-blue-50"><Phone size={18} /> Call the school</a>
      </div>
      <p className="mt-5 text-xs text-slate-600">For privacy, do not include a child's identity documents or payment information in an initial enquiry.</p>
    </div>
  </main>;
}
