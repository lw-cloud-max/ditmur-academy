"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { 
  ArrowRight, BookOpen, GraduationCap, Users, ShieldCheck, Sparkles, Trophy,
  Calendar, MapPin, Phone, Mail, ChevronRight, Star, Award, Globe, Library,
  Baby, Palette, Music, Dumbbell, Heart, Clock, CheckCircle2, Pencil, Calculator,
  Microscope, Globe2, BookOpenCheck, Smile, ChevronLeft, Pause, Play
} from 'lucide-react';

const HERO_SLIDES = [
  {
    title: 'Learning together',
    detail: 'A look inside our classrooms',
    href: '/programs/primary',
    mobile: '/images/landing/classroom-mobile.webp',
    desktop: '/images/landing/classroom-desktop.webp',
    alt: 'Ditmur Academy pupils learning together in a classroom'
  },
  {
    title: 'Discovering through science',
    detail: 'Explore our Secondary School',
    href: '/programs/secondary',
    mobile: '/images/secondary/chess-activity.webp',
    desktop: '/images/secondary/laboratory.webp',
    alt: 'Ditmur Academy learners exploring school activities'
  },
  {
    title: 'A warm start for little learners',
    detail: 'Explore our Crèche & Nursery',
    href: '/programs/creche',
    mobile: '/images/creche/room-play-shelf.webp',
    desktop: '/images/creche/rest-space-wide.webp',
    alt: 'Colourful crèche learning and rest space at Ditmur Academy'
  }
] as const;

const TICKER_TEXT = 'DITMUR ACADEMY  •  CULTIVATING EXCELLENCE AND DISCIPLINE  •  CRÈCHE  •  PRIMARY  •  SECONDARY  •  EXPLORE OUR PROGRAMMES  •  ASK ABOUT ADMISSIONS  •  ';

export default function LandingPage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [carouselPaused, setCarouselPaused] = useState(false);
  const [tickerPaused, setTickerPaused] = useState(false);
  const [carouselHovered, setCarouselHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (carouselPaused || carouselHovered || reducedMotion) return;
    const timer = window.setInterval(() => setActiveSlide(index => (index + 1) % HERO_SLIDES.length), 7000);
    return () => window.clearInterval(timer);
  }, [carouselPaused, carouselHovered, reducedMotion]);

  useEffect(() => {
    // Have the next slide ready before its automatic transition.
    const next = HERO_SLIDES[(activeSlide + 1) % HERO_SLIDES.length];
    const nextPhoto = new window.Image();
    nextPhoto.src = window.matchMedia('(min-width: 1024px)').matches ? next.desktop : next.mobile;
  }, [activeSlide]);

  const changeSlide = (index: number) => setActiveSlide((index + HERO_SLIDES.length) % HERO_SLIDES.length);
  const slide = HERO_SLIDES[activeSlide];
  return (
    <div className="min-h-screen bg-white font-sans selection:bg-[#0033A0] selection:text-white">
      <style>{`
        @keyframes ditmurTicker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes ditmurFade { from { opacity: 0; } to { opacity: 1; } }
        .ditmur-ticker-track { animation: ditmurTicker 32s linear infinite; }
        .ditmur-ticker:hover .ditmur-ticker-track { animation-play-state: paused !important; }
        .ditmur-slide { animation: ditmurFade .45s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .ditmur-ticker { overflow-x: auto; }
          .ditmur-ticker-track, .ditmur-slide { animation: none !important; transform: none !important; }
        }
      `}</style>
      <div role="region" aria-label={TICKER_TEXT} className="ditmur-ticker relative z-[60] h-9 overflow-hidden bg-[#0A192F] text-[#FFD700] flex items-center">
        <div aria-hidden="true" className="ditmur-ticker-track flex w-max whitespace-nowrap text-[11px] sm:text-xs font-bold uppercase tracking-widest" style={{ animationPlayState: tickerPaused ? 'paused' : 'running' }}>
          <span className="shrink-0 px-4">{TICKER_TEXT}</span>
          <span className="shrink-0 px-4">{TICKER_TEXT}</span>
        </div>
        <button type="button" onClick={() => setTickerPaused(value => !value)}
          aria-label={tickerPaused ? 'Resume moving school information' : 'Pause moving school information'}
          aria-pressed={tickerPaused}
          className="absolute right-0 inset-y-0 px-3 bg-[#0A192F] text-[#FFD700] hover:bg-[#112240] focus-visible:outline-2 focus-visible:outline-[#FFD700]"
        >{tickerPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}</button>
      </div>

      {/* Top Bar */}
      <div className="bg-[#0A192F] text-white h-9 px-6 lg:px-12 text-sm hidden md:flex items-center">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-6">
            <a href="mailto:ditmuracademy@gmail.com" className="flex items-center gap-2 hover:text-[#FFD700] transition-colors">
              <Mail className="w-3.5 h-3.5" />
              ditmuracademy@gmail.com
            </a>
            <a href="tel:+2348038164705" className="flex items-center gap-2 hover:text-[#FFD700] transition-colors">
              <Phone className="w-3.5 h-3.5" />
              08038164705
            </a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-[#FFD700] transition-colors">Student Portal</Link>
            <span className="text-slate-500">|</span>
            <Link href="/apply" className="hover:text-[#FFD700] transition-colors">Admissions</Link>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="absolute top-9 md:top-[72px] w-full z-50 px-4 sm:px-6 py-5 lg:px-12 flex justify-between items-center bg-transparent">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center shadow-md">
            <img src="/logo.jpg" alt="Ditmur Academy" className="w-full h-full object-contain mix-blend-multiply" />
          </div>
          <div>
            <span className="font-serif font-black text-[#0A192F] text-base sm:text-xl tracking-widest uppercase drop-shadow-md">Ditmur</span>
            <span className="block font-serif font-bold text-[#0033A0] text-xs tracking-[0.3em] uppercase -mt-1">Academy</span>
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-8">
          <Link href="#about" className="text-slate-700 hover:text-[#0033A0] font-medium transition-colors">About</Link>
          <Link href="#programs" className="text-slate-700 hover:text-[#0033A0] font-medium transition-colors">Programs</Link>
          <Link href="#admissions" className="text-slate-700 hover:text-[#0033A0] font-medium transition-colors">Admissions</Link>
          <Link href="#school-life" className="text-slate-700 hover:text-[#0033A0] font-medium transition-colors">School Life</Link>
          <Link href="#contact" className="text-slate-700 hover:text-[#0033A0] font-medium transition-colors">Contact</Link>
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="hidden sm:inline-flex px-6 py-2.5 bg-white/10 hover:bg-white/20 text-[#0A192F] border border-slate-200 backdrop-blur-md rounded-full font-bold text-sm transition-all shadow-sm">
            Portal Login
          </Link>
          <Link href="/apply" className="px-4 sm:px-6 py-2.5 bg-[#0033A0] hover:bg-[#002277] text-white rounded-full font-black text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
            Apply Now
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 lg:px-12 bg-gradient-to-br from-slate-50 to-blue-50 overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#0033A0] rounded-full blur-[150px] opacity-5 -mr-64 -mt-64"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#FFD700] rounded-full blur-[150px] opacity-5 -ml-64 -mb-64"></div>
        
        <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="lg:col-start-1 lg:row-start-1">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0033A0]/10 border border-[#0033A0]/20 text-[#0033A0] text-xs font-bold uppercase tracking-wider mb-6">
              <Sparkles className="w-4 h-4 text-[#FFD700]" /> Explore admission options
            </div>
            <h1 className="text-5xl lg:text-7xl font-black text-[#0A192F] leading-[1.1] mb-6 tracking-tight">
              Cultivating <span className="text-[#0033A0]">Excellence</span> <br/>& Discipline.
            </h1>
            <p className="text-lg text-slate-600 mb-8 max-w-lg leading-relaxed">
              From crèche to secondary school, Ditmur Academy provides a a caring education that builds strong foundations, nurtures creativity, and prepares your child for a successful future.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/apply" className="px-8 py-4 bg-[#0033A0] hover:bg-[#002277] text-white rounded-xl font-black text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 hover:-translate-y-1">
                Contact Admissions <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/login" className="px-8 py-4 bg-white hover:bg-slate-50 text-[#0A192F] border border-slate-200 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-sm">
                Student & Parent Portal
              </Link>
            </div>
            
          </div>

          <div className="relative mt-4 lg:mt-0 lg:col-start-2 lg:row-start-1 lg:row-span-2"
            onMouseEnter={() => setCarouselHovered(true)} onMouseLeave={() => setCarouselHovered(false)}>
            <div aria-hidden="true" className="absolute -inset-3 bg-gradient-to-br from-[#0033A0]/15 to-[#FFD700]/20 rounded-[36px] rotate-2"></div>
            <figure className="relative overflow-hidden rounded-[28px] border-4 border-white bg-[#0A192F] shadow-2xl">
              <div className="relative h-[430px] sm:h-[520px] lg:h-[500px]" role="group" aria-roledescription="carousel" aria-label="Life at Ditmur Academy" aria-live="off">
                <picture key={activeSlide} className="ditmur-slide absolute inset-0 block">
                  <source media="(min-width: 1024px)" srcSet={slide.desktop} type="image/webp" />
                  <img src={slide.mobile} alt={slide.alt} loading={activeSlide === 0 ? 'eager' : 'lazy'}
                    className="absolute inset-0 w-full h-full object-cover object-center" />
                </picture>
                <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0A192F]/90 to-transparent"></div>
                <div className="absolute bottom-5 left-5 right-5 text-white drop-shadow-md">
                  <p className="text-xl sm:text-2xl font-black">{slide.title}</p>
                  <Link href={slide.href} className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-white/95 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-white">
                    {slide.detail} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="absolute right-3 top-3 flex gap-2">
                  <button type="button" onClick={() => changeSlide(activeSlide - 1)} aria-label="Previous school photo"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0A192F]/75 text-white backdrop-blur-sm hover:bg-[#0033A0] focus-visible:outline-2 focus-visible:outline-white">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button type="button" onClick={() => changeSlide(activeSlide + 1)} aria-label="Next school photo"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0A192F]/75 text-white backdrop-blur-sm hover:bg-[#0033A0] focus-visible:outline-2 focus-visible:outline-white">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <figcaption className="sr-only">{slide.title}. {slide.detail}.</figcaption>
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white text-slate-700">
                <div className="flex gap-2" role="group" aria-label="Choose a school photo">
                  {HERO_SLIDES.map((item, index) => (
                    <button key={item.title} type="button" onClick={() => changeSlide(index)}
                      aria-label={`Show photo: ${item.title}`} aria-current={index === activeSlide ? 'true' : undefined}
                      className={`h-3 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-[#0033A0] ${index === activeSlide ? 'w-8 bg-[#0033A0]' : 'w-3 bg-slate-300 hover:bg-slate-500'}`} />
                  ))}
                </div>
                <button type="button" disabled={reducedMotion} onClick={() => setCarouselPaused(value => !value)}
                  aria-label={reducedMotion ? 'Automatic slideshow disabled by motion settings' : carouselPaused ? 'Resume automatic slideshow' : 'Pause automatic slideshow'}
                  aria-pressed={carouselPaused}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[#0033A0] hover:bg-blue-50 disabled:text-slate-400 focus-visible:outline-2 focus-visible:outline-[#0033A0]">
                  {carouselPaused || reducedMotion ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  <span>{reducedMotion ? 'Motion off' : carouselPaused ? 'Play' : 'Pause'}</span>
                </button>
              </div>
            </figure>
          </div>

          {/* Programme strengths, not unverified enrolment or exam statistics */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-6 border-t border-slate-200 lg:col-start-1 lg:row-start-2 w-full">
            <div className="rounded-xl border border-pink-100 bg-pink-50 p-3 sm:p-4 min-w-0">
              <p className="text-base sm:text-xl font-black text-pink-700">Care</p>
              <p className="text-[11px] sm:text-sm text-slate-600 font-medium leading-tight mt-1">Crèche & Nursery</p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 sm:p-4 min-w-0">
              <p className="text-base sm:text-xl font-black text-[#0033A0]">Curiosity</p>
              <p className="text-[11px] sm:text-sm text-slate-600 font-medium leading-tight mt-1">Primary School</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 sm:p-4 min-w-0">
              <p className="text-base sm:text-xl font-black text-emerald-700">Confidence</p>
              <p className="text-[11px] sm:text-sm text-slate-600 font-medium leading-tight mt-1">Secondary School</p>
            </div>
          </div>
        </div>
      </div>

      {/* Programs Section */}
      <div id="programs" className="py-24 px-6 lg:px-12 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0033A0]/10 text-[#0033A0] text-xs font-bold uppercase tracking-wider mb-4">
              Our Programs
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-[#0A192F] mb-4">School Programs</h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg">Comprehensive education from early childhood to secondary school.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Crèche */}
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 p-8 rounded-2xl border border-pink-100 hover:shadow-xl transition-all duration-300 group">
              <div className="w-16 h-16 bg-pink-100 text-pink-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Baby className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-3">Crèche & Nursery</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                A safe, nurturing environment for your little ones. We focus on early childhood development through play-based learning, creativity, and social skills.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-pink-500" />
                  Ages 1-3 years
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-pink-500" />
                  Play-based learning
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-pink-500" />
                  Safe & nurturing environment
                </li>
              </ul>
              <Link href="/programs/creche" className="text-pink-600 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all">
                See More <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Primary */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-100 hover:shadow-xl transition-all duration-300 group">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-3">Primary School</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                Building strong academic foundations with a balanced curriculum that develops critical thinking, creativity, and character.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  Ages 4-10 years
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  Strong academic foundation
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  Extracurricular activities
                </li>
              </ul>
              <Link href="/programs/primary" className="text-blue-600 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all">
                See More <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Secondary */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-8 rounded-2xl border border-emerald-100 hover:shadow-xl transition-all duration-300 group">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <GraduationCap className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-3">Secondary School</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                Preparing students for WAEC, NECO, and JAMB with rigorous academics, leadership development, and career guidance.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Ages 11-17 years
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  WAEC/NECO/JAMB preparation
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Leadership & career guidance
                </li>
              </ul>
              <Link href="/programs/secondary" className="text-emerald-600 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all">
                See More <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Apply for Admission CTA */}
      <div id="admissions" className="py-20 px-6 lg:px-12 bg-gradient-to-r from-[#0A192F] to-[#002277] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#FFD700] rounded-full blur-[150px] opacity-10 -mr-20 -mt-20"></div>
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-6">Ask About Admissions</h2>
          <p className="text-xl text-blue-200 mb-4">Contact our team for current admission information</p>
          <p className="text-blue-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Give your child the best start in life. At Ditmur Academy, we don't just teach—we inspire, nurture, and prepare 
            young minds for a bright future. Join our family today!
          </p>
          <Link href="/apply" className="inline-flex items-center gap-2 px-10 py-5 bg-[#FFD700] hover:bg-[#e6c200] text-slate-900 rounded-xl font-black text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
            Apply Now <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* About Section */}
      <div id="about" className="py-24 px-6 lg:px-12 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0033A0]/10 text-[#0033A0] text-xs font-bold uppercase tracking-wider mb-6">
              About Ditmur Academy
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-[#0A192F] mb-6 leading-tight">
              Nurturing Young Minds Since Establishment
            </h2>
            <p className="text-slate-600 mb-6 leading-relaxed">
              Ditmur Academy was established to provide quality education for children from crèche to secondary school. 
              We are committed to nurturing well-rounded individuals who excel academically, morally, and socially.
            </p>
            <p className="text-slate-600 mb-8 leading-relaxed">
              Across our crèche, primary and secondary programmes, we aim to create a welcoming environment where
              every child can discover their potential and thrive.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="font-medium text-slate-700">Safe Environment</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                </div>
                <span className="font-medium text-slate-700">Qualified Teachers</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-purple-600" />
                </div>
                <span className="font-medium text-slate-700">Modern Facilities</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-orange-600" />
                </div>
                <span className="font-medium text-slate-700">Holistic Development</span>
              </div>
            </div>
            <Link href="#contact" className="inline-flex items-center gap-2 px-8 py-4 bg-[#0033A0] hover:bg-[#002277] text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl">
              Contact Us <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-pink-100 text-pink-600 rounded-xl flex items-center justify-center mb-4">
                <Smile className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Happy Children</h3>
              <p className="text-sm text-slate-600">A joyful learning environment where children feel safe and valued.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                <BookOpenCheck className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Strong Foundation</h3>
              <p className="text-sm text-slate-600">Building essential skills for lifelong learning and success.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                <Pencil className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Creative Learning</h3>
              <p className="text-sm text-slate-600">Encouraging creativity through arts, music, and hands-on activities.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-4">
                <Heart className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Caring Staff</h3>
              <p className="text-sm text-slate-600">Dedicated teachers who genuinely care about each child's growth.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Why Choose Us */}
      <div id="school-life" className="py-24 px-6 lg:px-12 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black text-[#0A192F] mb-4">Why Choose Ditmur Academy?</h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg">We provide a holistic education that develops the whole child.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-blue-50 text-[#0033A0] rounded-2xl flex items-center justify-center mb-6">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Strong Academics</h3>
              <p className="text-slate-600 leading-relaxed">Our curriculum meets national standards while incorporating best practices to ensure academic excellence at every level.</p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                <Trophy className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Character Building</h3>
              <p className="text-slate-600 leading-relaxed">We instill strong values, discipline, and leadership qualities that prepare children for life beyond school.</p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Safe & Secure</h3>
              <p className="text-slate-600 leading-relaxed">Your child's safety is our priority. We maintain a secure, clean, and welcoming environment for all students.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 px-6 bg-[#0A192F] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-[#0033A0] rounded-full blur-[150px] opacity-30 -ml-20 -mt-20"></div>
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-[#FFD700] rounded-full blur-[150px] opacity-10 -mr-20 -mb-20"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-6">Give Your Child the Best Start</h2>
          <p className="text-blue-200 mb-10 max-w-xl mx-auto text-lg">Join the Ditmur Academy family today and watch your child flourish in a nurturing, excellence-driven environment.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/apply" className="inline-flex items-center gap-2 px-10 py-5 bg-[#FFD700] hover:bg-[#e6c200] text-slate-900 rounded-xl font-black text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
              Enquire About Admissions <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/login" className="inline-flex items-center gap-2 px-10 py-5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl font-bold text-lg transition-all">
              Access Portal
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer id="contact" className="bg-[#0A192F] text-white pt-20 pb-8 px-6 lg:px-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 flex items-center justify-center">
                  <img src="/logo.jpg" alt="Ditmur Academy" className="w-full h-full object-contain mix-blend-screen" />
                </div>
                <div>
                  <span className="font-serif font-black text-white text-lg tracking-widest uppercase">Ditmur</span>
                  <span className="block font-serif font-bold text-[#FFD700] text-xs tracking-[0.3em] uppercase">Academy</span>
                </div>
              </div>
              <p className="text-blue-300 text-sm leading-relaxed mb-6">
                Nurturing Future Leaders. Providing quality crèche, primary, and secondary education in a safe and caring environment.
              </p>
              <div className="flex gap-4">
                {['Facebook', 'Twitter', 'Instagram', 'WhatsApp'].map((social, i) => (
                  <a key={i} href="#" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-[#FFD700] hover:text-[#0A192F] transition-all text-sm font-bold">
                    {social[0]}
                  </a>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-6">Quick Links</h3>
              <ul className="space-y-3">
                {['About Us', 'Programs', 'Admissions', 'School Life', 'Contact'].map((link, i) => (
                  <li key={i}>
                    <a href="#" className="text-blue-300 hover:text-[#FFD700] transition-colors text-sm">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-6">Programs</h3>
              <ul className="space-y-3">
                {['Crèche & Nursery', 'Primary School', 'Secondary School', 'After School Care', 'Holiday Programs'].map((link, i) => (
                  <li key={i}>
                    <a href="#" className="text-blue-300 hover:text-[#FFD700] transition-colors text-sm">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-6">Contact Us</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#FFD700] mt-0.5 shrink-0" />
                  <p className="text-blue-300 text-sm">11, Adeshina Close Off Pipeline, Ishasi Akute, Ogun State</p>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-[#FFD700] shrink-0" />
                  <div className="text-blue-300 text-sm">
                    <p>08038164705</p>
                    <p>09069937111</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-[#FFD700] shrink-0" />
                  <p className="text-blue-300 text-sm">ditmuracademy@gmail.com</p>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-[#FFD700] shrink-0" />
                  <p className="text-blue-300 text-sm">Mon - Fri: 7:30 AM - 3:30 PM</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-blue-400 text-sm">
              © {new Date().getFullYear()} Ditmur Academy. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="/terms" className="text-blue-400 hover:text-[#FFD700] text-sm transition-colors">Terms of Service</Link>
              <Link href="/privacy" className="text-blue-400 hover:text-[#FFD700] text-sm transition-colors">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
