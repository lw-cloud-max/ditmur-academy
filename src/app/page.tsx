"use client";

import Link from 'next/link';
import { 
  ArrowRight, BookOpen, GraduationCap, Users, ShieldCheck, Sparkles, Trophy,
  Calendar, MapPin, Phone, Mail, ChevronRight, Star, Award, Globe, Library,
  Baby, Palette, Music, Dumbbell, Heart, Clock, CheckCircle2, Pencil, Calculator,
  Microscope, Globe2, BookOpenCheck, Smile
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans selection:bg-[#0033A0] selection:text-white">
      
      {/* Top Bar */}
      <div className="bg-[#0A192F] text-white py-2 px-6 lg:px-12 text-sm hidden md:block">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <a href="mailto:info@ditmuracademy.edu.ng" className="flex items-center gap-2 hover:text-[#FFD700] transition-colors">
              <Mail className="w-3.5 h-3.5" />
              info@ditmuracademy.edu.ng
            </a>
            <a href="tel:+2348012345678" className="flex items-center gap-2 hover:text-[#FFD700] transition-colors">
              <Phone className="w-3.5 h-3.5" />
              +234 801 234 5678
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
      <nav className="absolute top-0 md:top-10 w-full z-50 px-6 py-6 lg:px-12 flex justify-between items-center bg-transparent">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 flex items-center justify-center shadow-md">
            <img src="/logo.jpg" alt="Ditmur Academy" className="w-full h-full object-contain mix-blend-multiply" />
          </div>
          <div>
            <span className="font-serif font-black text-[#0A192F] text-xl tracking-widest uppercase drop-shadow-md">Ditmur</span>
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
          <Link href="/login" className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-[#0A192F] border border-slate-200 backdrop-blur-md rounded-full font-bold text-sm transition-all shadow-sm">
            Portal Login
          </Link>
          <Link href="/apply" className="px-6 py-2.5 bg-[#0033A0] hover:bg-[#002277] text-white rounded-full font-black text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
            Apply Now
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 lg:px-12 bg-gradient-to-br from-slate-50 to-blue-50 overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#0033A0] rounded-full blur-[150px] opacity-5 -mr-64 -mt-64"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#FFD700] rounded-full blur-[150px] opacity-5 -ml-64 -mb-64"></div>
        
        <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0033A0]/10 border border-[#0033A0]/20 text-[#0033A0] text-xs font-bold uppercase tracking-wider mb-6">
              <Sparkles className="w-4 h-4 text-[#FFD700]" /> Admission for 2026/2027 is open
            </div>
            <h1 className="text-5xl lg:text-7xl font-black text-[#0A192F] leading-[1.1] mb-6 tracking-tight">
              Cultivating <span className="text-[#0033A0]">Excellence</span> <br/>& Discipline.
            </h1>
            <p className="text-lg text-slate-600 mb-8 max-w-lg leading-relaxed">
              From crèche to secondary school, Ditmur Academy provides a world-class education that builds strong foundations, nurtures creativity, and prepares your child for a successful future.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/apply" className="px-8 py-4 bg-[#0033A0] hover:bg-[#002277] text-white rounded-xl font-black text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 hover:-translate-y-1">
                Start Application <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/login" className="px-8 py-4 bg-white hover:bg-slate-50 text-[#0A192F] border border-slate-200 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-sm">
                Student & Parent Portal
              </Link>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-slate-200">
              <div>
                <h3 className="text-3xl font-black text-[#0033A0]">1,000+</h3>
                <p className="text-sm text-slate-500 font-medium">Happy Students</p>
              </div>
              <div>
                <h3 className="text-3xl font-black text-[#0033A0]">100%</h3>
                <p className="text-sm text-slate-500 font-medium">WAEC Pass Rate</p>
              </div>
              <div>
                <h3 className="text-3xl font-black text-[#0033A0]">30+</h3>
                <p className="text-sm text-slate-500 font-medium">Expert Teachers</p>
              </div>
            </div>
          </div>
          
          <div className="relative hidden lg:block h-[600px]">
             <div className="absolute inset-0 bg-gradient-to-tr from-[#0033A0]/10 to-[#FFD700]/10 rounded-[40px] border border-slate-200 backdrop-blur-xl transform rotate-3 scale-95 transition-transform duration-700 hover:rotate-0 hover:scale-100"></div>
             <div className="absolute inset-0 bg-white rounded-[40px] border border-slate-200 shadow-2xl p-8 flex flex-col justify-between overflow-hidden">
                <img src="/logo.jpg" alt="Ditmur Academy" className="w-full h-full object-contain opacity-90" />
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
              <Link href="/apply" className="text-pink-600 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all">
                Learn More <ChevronRight className="w-4 h-4" />
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
              <Link href="/apply" className="text-blue-600 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all">
                Learn More <ChevronRight className="w-4 h-4" />
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
              <Link href="/apply" className="text-emerald-600 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all">
                Learn More <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Apply for Admission CTA */}
      <div id="admissions" className="py-20 px-6 lg:px-12 bg-gradient-to-r from-[#0A192F] to-[#002277] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#FFD700] rounded-full blur-[150px] opacity-10 -mr-20 -mt-20"></div>
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-6">Apply for Admission</h2>
          <p className="text-xl text-blue-200 mb-4">2026/2027 applications are now open</p>
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
              With over 1,000 students and 30+ dedicated teachers, we create a warm, supportive environment where 
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

      {/* Testimonials */}
      <div className="py-24 px-6 lg:px-12 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0033A0]/10 text-[#0033A0] text-xs font-bold uppercase tracking-wider mb-4">
              Testimonials
            </div>
            <h2 className="text-4xl font-black text-[#0A192F] mb-4">What Parents Say</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: 'Mrs. Adebayo', role: 'Parent of Primary 3 Student', text: 'My daughter loves going to school every day. The teachers are caring and the environment is safe. She has improved so much academically!' },
              { name: 'Mr. Okonkwo', role: 'Parent of JSS2 Student', text: 'Ditmur Academy has been a great choice for our family. The communication with parents is excellent and my son is thriving.' },
              { name: 'Mrs. Fatima', role: 'Parent of Crèche Student', text: 'I was worried about leaving my toddler, but the crèche staff are amazing. My child is happy, safe, and learning every day.' },
            ].map((testimonial, i) => (
              <div key={i} className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-5 h-5 text-[#FFD700] fill-[#FFD700]" />
                  ))}
                </div>
                <p className="text-slate-600 mb-6 leading-relaxed italic">"{testimonial.text}"</p>
                <div>
                  <p className="font-bold text-slate-900">{testimonial.name}</p>
                  <p className="text-sm text-slate-500">{testimonial.role}</p>
                </div>
              </div>
            ))}
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
              Apply for Admission <ArrowRight className="w-5 h-5" />
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
                  <p className="text-blue-300 text-sm">123 Academy Road, Lagos, Nigeria</p>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-[#FFD700] shrink-0" />
                  <p className="text-blue-300 text-sm">+234 801 234 5678</p>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-[#FFD700] shrink-0" />
                  <p className="text-blue-300 text-sm">info@ditmuracademy.edu.ng</p>
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
              <a href="#" className="text-blue-400 hover:text-[#FFD700] text-sm transition-colors">Privacy Policy</a>
              <a href="#" className="text-blue-400 hover:text-[#FFD700] text-sm transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
