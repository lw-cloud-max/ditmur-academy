"use client";

import Link from 'next/link';
import { ArrowLeft, Baby, Heart, Shield, Star } from 'lucide-react';
import Image from 'next/image';

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
                  <p className="text-sm text-slate-600">A welcoming space with attentive care during the school day</p>
                </div>
              </div>
            </div>

            <Link href="/apply" className="inline-flex items-center gap-2 px-8 py-4 bg-pink-500 text-white rounded-xl font-bold hover:bg-pink-600 transition-colors">
              Apply for Admission
            </Link>
          </div>

          {/* Real crèche photos provided by the school */}
          <section aria-labelledby="creche-gallery-title" className="space-y-4">
            <div>
              <h2 id="creche-gallery-title" className="text-xl font-bold text-slate-900">A look inside our crèche</h2>
              <p className="text-sm text-slate-600 mt-1">A colourful space for play, rest and discovery.</p>
            </div>
            <figure className="overflow-hidden rounded-2xl border border-pink-100 bg-pink-50 shadow-sm">
              <div className="relative aspect-[16/10]">
                <Image
                  src="/images/creche/rest-space-wide.webp"
                  alt="Crèche room with colourful play mats, cushions and rest spaces"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                  className="object-cover"
                />
              </div>
              <figcaption className="px-4 py-3 text-sm text-slate-600">Colourful mats and cosy spaces for little learners.</figcaption>
            </figure>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <figure className="overflow-hidden rounded-xl border border-pink-100 bg-pink-50 shadow-sm">
                <div className="relative aspect-[3/4]">
                  <Image
                    src="/images/creche/room-play-shelf.webp"
                    alt="Crèche play area with toys on a shelf and floor mats"
                    fill
                    sizes="(max-width: 640px) 48vw, (max-width: 1024px) 45vw, 24vw"
                    className="object-cover object-center"
                  />
                </div>
                <figcaption className="px-3 py-2 text-xs sm:text-sm text-slate-600">Play and discovery</figcaption>
              </figure>
              <figure className="overflow-hidden rounded-xl border border-pink-100 bg-pink-50 shadow-sm">
                <div className="relative aspect-[3/4]">
                  <Image
                    src="/images/creche/room-rest-area.webp"
                    alt="Crèche rest area with cushioned mats and colourful curtains"
                    fill
                    sizes="(max-width: 640px) 48vw, (max-width: 1024px) 45vw, 24vw"
                    className="object-cover object-center"
                  />
                </div>
                <figcaption className="px-3 py-2 text-xs sm:text-sm text-slate-600">Comfortable rest spaces</figcaption>
              </figure>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
