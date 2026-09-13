"use client";

import Link from 'next/link';
import { ArrowLeft, Lock, Eye, Shield, Database, Cookie, Globe, Mail, Phone, MapPin, UserCheck, AlertTriangle } from 'lucide-react';

export default function PrivacyPage() {
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
              <Lock className="w-6 h-6 text-[#FFD700]" />
            </div>
            <h1 className="text-4xl font-black text-white">Privacy Policy</h1>
          </div>
          <p className="text-blue-200">Last updated: September 13, 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-slate max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Shield className="w-6 h-6 text-[#0033A0]" />
              1. Introduction
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Ditmur Academy ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our School Management System.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Database className="w-6 h-6 text-[#0033A0]" />
              2. Information We Collect
            </h2>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <h3 className="font-bold text-blue-900 mb-2">Personal Information</h3>
                <ul className="list-disc list-inside text-blue-800 text-sm space-y-1">
                  <li>Student names, dates of birth, and gender</li>
                  <li>Parent/guardian names, email addresses, and phone numbers</li>
                  <li>Staff names, email addresses, and contact information</li>
                  <li>Student ID numbers and class assignments</li>
                </ul>
              </div>
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                <h3 className="font-bold text-emerald-900 mb-2">Academic Information</h3>
                <ul className="list-disc list-inside text-emerald-800 text-sm space-y-1">
                  <li>Grades and academic records</li>
                  <li>Attendance records</li>
                  <li>Exam results and assessments</li>
                  <li>Behavioral records</li>
                </ul>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                <h3 className="font-bold text-purple-900 mb-2">Usage Information</h3>
                <ul className="list-disc list-inside text-purple-800 text-sm space-y-1">
                  <li>Log data and device information</li>
                  <li>Usage patterns and preferences</li>
                  <li>Communication records within the platform</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Eye className="w-6 h-6 text-[#0033A0]" />
              3. How We Use Your Information
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">We use the collected information for:</p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 mb-4">
              <li>Providing and maintaining the School Management System</li>
              <li>Managing student academic records and progress</li>
              <li>Facilitating communication between parents, teachers, and administrators</li>
              <li>Processing fee payments and generating invoices</li>
              <li>Sending important notifications and updates</li>
              <li>Improving our services and user experience</li>
              <li>Ensuring compliance with educational regulations</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Lock className="w-6 h-6 text-[#0033A0]" />
              4. Data Security
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              We implement appropriate security measures to protect your personal information, including:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 mb-4">
              <li>Encryption of data in transit and at rest</li>
              <li>Secure authentication and access controls</li>
              <li>Regular security audits and updates</li>
              <li>Limited access to personal information on a need-to-know basis</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Data Sharing</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              We do not sell or rent your personal information to third parties. We may share information with:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 mb-4">
              <li>Payment processors (for fee payments)</li>
              <li>SMS service providers (for notifications)</li>
              <li>AI service providers (for educational features)</li>
              <li>Legal authorities when required by law</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-[#0033A0]" />
              6. Your Rights
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">You have the right to:</p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 mb-4">
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Opt-out of non-essential communications</li>
              <li>File a complaint with data protection authorities</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-[#0033A0]" />
              7. Children's Privacy
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              We collect information about students from parents/guardians and the school. We do not knowingly collect personal information directly from children under 13 without parental consent.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Changes to This Policy</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Mail className="w-6 h-6 text-[#0033A0]" />
              9. Contact Us
            </h2>
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
              <p className="text-slate-600 mb-4">If you have any questions about this Privacy Policy, please contact us:</p>
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-slate-700">
                  <Mail className="w-4 h-4 text-[#0033A0]" />
                  privacy@ditmuracademy.edu.ng
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
