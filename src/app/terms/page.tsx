"use client";

import Link from 'next/link';
import { ArrowLeft, Shield, FileText, Scale, Users, Lock, Eye, Globe, Mail, Phone, MapPin } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0A192F] to-[#002277] py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <Scale className="w-6 h-6 text-[#FFD700]" />
            </div>
            <h1 className="text-4xl font-black text-white">Terms of Service</h1>
          </div>
          <p className="text-blue-200">Last updated: September 13, 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-slate max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#0033A0]" />
              1. Acceptance of Terms
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              By accessing and using the Ditmur Academy School Management System ("the App"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Users className="w-6 h-6 text-[#0033A0]" />
              2. User Accounts
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              To access certain features of the App, you must register for an account. You agree to:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 mb-4">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security of your password and account</li>
              <li>Accept all responsibility for all activities that occur under your account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Shield className="w-6 h-6 text-[#0033A0]" />
              3. User Roles and Responsibilities
            </h2>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <h3 className="font-bold text-blue-900 mb-2">Administrators & Staff</h3>
                <p className="text-blue-800 text-sm">Responsible for managing student data, academic records, and system configuration. Must maintain confidentiality of student information.</p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                <h3 className="font-bold text-emerald-900 mb-2">Teachers</h3>
                <p className="text-emerald-800 text-sm">Responsible for creating lesson plans, grading students, and maintaining accurate academic records.</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                <h3 className="font-bold text-purple-900 mb-2">Students</h3>
                <p className="text-purple-800 text-sm">Responsible for their own learning, completing assignments, and maintaining academic integrity.</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                <h3 className="font-bold text-amber-900 mb-2">Parents</h3>
                <p className="text-amber-800 text-sm">Responsible for monitoring their child's academic progress and maintaining communication with the school.</p>
              </div>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Acceptable Use</h2>
            <p className="text-slate-600 leading-relaxed mb-4">You agree not to:</p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 mb-4">
              <li>Use the App for any unlawful purpose or in violation of any local, state, national, or international law</li>
              <li>Transmit any material that is defamatory, offensive, or otherwise objectionable</li>
              <li>Attempt to gain unauthorized access to any portion of the App</li>
              <li>Interfere with or disrupt the App or servers</li>
              <li>Use the App to send unsolicited communications</li>
              <li>Impersonate any person or entity</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Academic Integrity</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              All users must maintain academic integrity. Cheating, plagiarism, or any form of academic dishonesty is strictly prohibited and may result in disciplinary action.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Payment Terms</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              School fees and other payments processed through the App are subject to the school's payment policies. All payments are processed securely through our payment partners.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Limitation of Liability</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Ditmur Academy shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the App.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Changes to Terms</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through the App.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Mail className="w-6 h-6 text-[#0033A0]" />
              9. Contact Information
            </h2>
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
              <p className="text-slate-600 mb-4">If you have any questions about these Terms, please contact us:</p>
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-slate-700">
                  <Mail className="w-4 h-4 text-[#0033A0]" />
                  info@ditmuracademy.edu.ng
                </p>
                <p className="flex items-center gap-2 text-slate-700">
                  <Phone className="w-4 h-4 text-[#0033A0]" />
                  +234 801 234 5678
                </p>
                <p className="flex items-center gap-2 text-slate-700">
                  <MapPin className="w-4 h-4 text-[#0033A0]" />
                  123 Academy Road, Lagos, Nigeria
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
