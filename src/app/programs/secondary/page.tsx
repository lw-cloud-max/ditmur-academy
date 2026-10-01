"use client";

import Link from 'next/link';
import { ArrowLeft, GraduationCap, Trophy, Award } from 'lucide-react';
import Image from 'next/image';

export default function SecondaryPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white">Secondary School</h1>
              <p className="text-emerald-100 mt-2">Ages 11-17 years • Preparing for the Future</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="text-3xl font-black text-slate-900 mb-6">Preparing Future Leaders</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Our Secondary School program prepares students for WAEC, NECO, and JAMB examinations while developing critical thinking, leadership skills, and career readiness. Students are equipped with the knowledge and skills needed for higher education and beyond.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <GraduationCap className="w-5 h-5 text-emerald-500 mt-1 shrink-0" />
                <div>
                  <h3 className="font-bold text-slate-900">Exam Preparation</h3>
                  <p className="text-sm text-slate-600">Comprehensive WAEC, NECO, and JAMB preparation</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Award className="w-5 h-5 text-emerald-500 mt-1 shrink-0" />
                <div>
                  <h3 className="font-bold text-slate-900">Leadership Development</h3>
                  <p className="text-sm text-slate-600">Building future leaders through clubs and activities</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Trophy className="w-5 h-5 text-emerald-500 mt-1 shrink-0" />
                <div>
                  <h3 className="font-bold text-slate-900">Career Guidance</h3>
                  <p className="text-sm text-slate-600">Preparing students for higher education and careers</p>
                </div>
              </div>
            </div>

            <Link href="/apply" className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors">
              Apply for Admission
            </Link>
          </div>

          {/* Selected school-provided secondary school photos */}
          <section aria-labelledby="secondary-gallery-title" className="space-y-4">
            <div>
              <h2 id="secondary-gallery-title" className="text-xl font-bold text-slate-900">Life in our secondary school</h2>
              <p className="text-sm text-slate-600 mt-1">Classroom learning, practical work and time together.</p>
            </div>
            <figure className="overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50 shadow-sm">
              <div className="relative aspect-[7/5]">
                <Image
                  src="/images/secondary/laboratory.webp"
                  alt="Secondary students in laboratory coats taking part in a science practical"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-contain"
                />
              </div>
              <figcaption className="px-4 py-3 text-sm text-slate-600">Hands-on learning in the science laboratory.</figcaption>
            </figure>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <figure className="overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50 shadow-sm">
                <div className="relative aspect-[3/4]">
                  <Image
                    src="/images/secondary/chess-activity.webp"
                    alt="Secondary pupils gathering around classroom chess and strategy games"
                    fill
                    sizes="(max-width: 640px) 48vw, (max-width: 1024px) 45vw, 24vw"
                    className="object-cover object-center"
                  />
                </div>
                <figcaption className="px-3 py-2 text-xs sm:text-sm text-slate-600">Strategy and teamwork</figcaption>
              </figure>
              <figure className="overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50 shadow-sm">
                <div className="relative aspect-[3/4]">
                  <Image
                    src="/images/secondary/guided-lesson.webp"
                    alt="Teacher leading a discussion with secondary school pupils"
                    fill
                    sizes="(max-width: 640px) 48vw, (max-width: 1024px) 45vw, 24vw"
                    className="object-cover object-bottom"
                  />
                </div>
                <figcaption className="px-3 py-2 text-xs sm:text-sm text-slate-600">Engaged in class</figcaption>
              </figure>
            </div>
            <figure className="overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50 shadow-sm">
              <div className="relative aspect-[9/4]">
                <Image
                  src="/images/secondary/class-discussion.webp"
                  alt="Students at desks listening to a teacher during a classroom lesson"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover object-center"
                />
              </div>
              <figcaption className="px-4 py-3 text-sm text-slate-600">An interactive classroom session.</figcaption>
            </figure>
          </section>
        </div>
      </div>
    </div>
  );
}
