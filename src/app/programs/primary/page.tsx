"use client";

import Link from 'next/link';
import { ArrowLeft, BookOpen, Trophy, Star } from 'lucide-react';
import Image from 'next/image';

export default function PrimaryPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white">Primary School</h1>
              <p className="text-blue-100 mt-2">Ages 4-10 years • Building Strong Foundations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="text-3xl font-black text-slate-900 mb-6">Building Strong Foundations</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Our Primary School program provides a comprehensive curriculum that balances academic excellence with character development. Students develop critical thinking, creativity, and a love for learning through engaging lessons and extracurricular activities.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-blue-500 mt-1 shrink-0" />
                <div>
                  <h3 className="font-bold text-slate-900">Strong Academics</h3>
                  <p className="text-sm text-slate-600">Comprehensive curriculum meeting national standards</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Trophy className="w-5 h-5 text-blue-500 mt-1 shrink-0" />
                <div>
                  <h3 className="font-bold text-slate-900">Extracurricular Activities</h3>
                  <p className="text-sm text-slate-600">Sports, arts, music, and clubs</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Star className="w-5 h-5 text-blue-500 mt-1 shrink-0" />
                <div>
                  <h3 className="font-bold text-slate-900">Character Development</h3>
                  <p className="text-sm text-slate-600">Building values, discipline, and leadership</p>
                </div>
              </div>
            </div>

            <Link href="/apply" className="inline-flex items-center gap-2 px-8 py-4 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors">
              Apply for Admission
            </Link>
          </div>

          {/* Primary school photos provided by the school */}
          <section aria-labelledby="primary-gallery-title" className="space-y-4">
            <div>
              <h2 id="primary-gallery-title" className="text-xl font-bold text-slate-900">Inside our primary classrooms</h2>
              <p className="text-sm text-slate-600 mt-1">Everyday moments of learning together.</p>
            </div>
            <figure className="overflow-hidden rounded-2xl border border-blue-100 bg-blue-50 shadow-sm">
              <div className="relative aspect-[16/10]">
                <Image
                  src="/images/primary/classroom-lesson-wide.webp"
                  alt="Teacher at a whiteboard while pupils work at colourful classroom desks"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="px-4 py-3 text-sm text-slate-600">Learning together in the classroom.</figcaption>
            </figure>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <figure className="overflow-hidden rounded-xl border border-blue-100 bg-blue-50 shadow-sm">
                <div className="relative aspect-[3/4]">
                  <Image
                    src="/images/primary/pupils-at-desks.webp"
                    alt="Primary pupils working in exercise books at their desks"
                    fill
                    sizes="(max-width: 640px) 48vw, (max-width: 1024px) 45vw, 24vw"
                    className="object-cover object-center"
                  />
                </div>
                <figcaption className="px-3 py-2 text-xs sm:text-sm text-slate-600">Focused classroom work</figcaption>
              </figure>
              <figure className="overflow-hidden rounded-xl border border-blue-100 bg-blue-50 shadow-sm">
                <div className="relative aspect-[3/4]">
                  <Image
                    src="/images/primary/guided-reading.webp"
                    alt="Teacher guiding pupils as they read at classroom tables"
                    fill
                    sizes="(max-width: 640px) 48vw, (max-width: 1024px) 45vw, 24vw"
                    className="object-cover object-center"
                  />
                </div>
                <figcaption className="px-3 py-2 text-xs sm:text-sm text-slate-600">Reading and guidance</figcaption>
              </figure>
            </div>
            <figure className="overflow-hidden rounded-2xl border border-blue-100 bg-blue-50 shadow-sm">
              <div className="relative aspect-[2/1]">
                <Image
                  src="/images/primary/group-activity.webp"
                  alt="Children working with colourful learning materials at classroom tables"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover object-center"
                />
              </div>
              <figcaption className="px-4 py-3 text-sm text-slate-600">Hands-on activities with classmates.</figcaption>
            </figure>
          </section>
        </div>
      </div>
    </div>
  );
}
