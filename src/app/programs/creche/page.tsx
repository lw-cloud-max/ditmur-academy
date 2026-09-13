"use client";

import Link from 'next/link';
import { ArrowLeft, Baby, Heart, Shield, Star, CheckCircle2, Image as ImageIcon } from 'lucide-react';

export default function CrechePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Baby className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white">Crèche & Nursery</h1>
              <p className="text-pink-100 mt-2">Ages 1-3 years • Play-based Learning</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="text-3xl font-black text-slate-900 mb-6">Nurturing Your Little Ones</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Our Crèche & Nursery program provides a warm, safe, and stimulating environment where your child can explore, learn, and grow. We understand that the early years are crucial for development, and our dedicated staff ensures every child feels valued and supported.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <Heart className="w-5 h-5 text-pink-500 mt-1 shrink-0" />
                <div>
                  <h3 className="font-bold text-slate-900">Caring Environment</h3>
                  <p className="text-sm text-slate-600">Warm, nurturing spaces designed for toddlers</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Star className="w-5 h-5 text-pink-500 mt-1 shrink-0" />
                <div>
                  <h3 className="font-bold text-slate-900">Play-Based Learning</h3>
                  <p className="text-sm text-slate-600">Learning through play, creativity, and exploration</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-pink-500 mt-1 shrink-0" />
                <div>
                  <h3 className="font-bold text-slate-900">Safe & Secure</h3>
                  <p className="text-sm text-slate-600">Child-proofed facilities with 24/7 supervision</p>
                </div>
              </div>
            </div>

            <Link href="/apply" className="inline-flex items-center gap-2 px-8 py-4 bg-pink-500 text-white rounded-xl font-bold hover:bg-pink-600 transition-colors">
              Apply for Admission
            </Link>
          </div>

          {/* Image Gallery Placeholder */}
          <div className="space-y-4">
            <div className="bg-pink-50 rounded-2xl border-2 border-dashed border-pink-200 p-12 text-center">
              <ImageIcon className="w-16 h-16 text-pink-300 mx-auto mb-4" />
              <p className="text-pink-600 font-bold">Crèche Photo Gallery</p>
              <p className="text-sm text-pink-500 mt-2">Photos will be added here</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-pink-50 rounded-xl border-2 border-dashed border-pink-200 h-40 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-pink-300" />
              </div>
              <div className="bg-pink-50 rounded-xl border-2 border-dashed border-pink-200 h-40 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-pink-300" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
