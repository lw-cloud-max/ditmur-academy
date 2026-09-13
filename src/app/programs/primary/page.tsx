"use client";

import Link from 'next/link';
import { ArrowLeft, BookOpen, GraduationCap, Trophy, Star, CheckCircle2, Image as ImageIcon } from 'lucide-react';

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

          {/* Image Gallery Placeholder */}
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-2xl border-2 border-dashed border-blue-200 p-12 text-center">
              <ImageIcon className="w-16 h-16 text-blue-300 mx-auto mb-4" />
              <p className="text-blue-600 font-bold">Primary School Photo Gallery</p>
              <p className="text-sm text-blue-500 mt-2">Photos will be added here</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl border-2 border-dashed border-blue-200 h-40 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-blue-300" />
              </div>
              <div className="bg-blue-50 rounded-xl border-2 border-dashed border-blue-200 h-40 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-blue-300" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
