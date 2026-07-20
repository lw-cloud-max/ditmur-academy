"use client";

import { useState, useEffect } from 'react';
import { Gamepad2, BrainCircuit, Loader2, ArrowRight, ArrowLeft, CheckCircle2, RotateCw } from 'lucide-react';
import Link from 'next/link';

export default function StudyHubPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Flashcard State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    fetch('/api/subjects')
      .then(res => res.json())
      .then(data => {
        if (data.success) setSubjects(data.data);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedSubject) {
      setQuestions([]);
      return;
    }
    setLoading(true);
    fetch(`/api/question-bank?subjectId=${selectedSubject}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Shuffle the questions for a fresh study session
          setQuestions(data.data.sort(() => Math.random() - 0.5));
          setCurrentIndex(0);
          setIsFlipped(false);
        }
        setLoading(false);
      });
  }, [selectedSubject]);

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev - 1), 150);
    }
  };

  if (loading && !selectedSubject) return <div className="p-24 flex justify-center"><Loader2 className="w-12 h-12 text-[#FFD700] animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-32">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Study Hub</h1>
          <p className="text-slate-500">Interactive flashcards generated from the global Question Bank.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Select Subject to Study</label>
        <select 
          value={selectedSubject} 
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0033A0] font-bold text-[#0033A0]"
        >
          <option value="">-- Choose Subject --</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="p-24 flex justify-center"><Loader2 className="w-12 h-12 text-[#0033A0] animate-spin" /></div>
      ) : selectedSubject && questions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <BrainCircuit className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No questions found</h3>
          <p className="text-slate-500">The global question bank for this subject is currently empty.</p>
        </div>
      ) : selectedSubject && questions.length > 0 ? (
        <div className="flex flex-col items-center">
          
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">
            Card {currentIndex + 1} of {questions.length}
          </p>

          {/* 3D FLASHCARD CONTAINER */}
          <div className="relative w-full max-w-2xl h-96 [perspective:1000px] cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
            <div className={`w-full h-full transition-all duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
              
              {/* FRONT (QUESTION) */}
              <div className="absolute inset-0 w-full h-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 flex flex-col justify-center items-center text-center [backface-visibility:hidden]">
                <BrainCircuit className="w-10 h-10 text-blue-200 absolute top-6 left-6" />
                <h2 className="text-3xl font-black text-slate-900 leading-relaxed whitespace-pre-wrap px-8">
                  {questions[currentIndex].text}
                </h2>
                <div className="absolute bottom-6 text-sm font-bold text-slate-400 flex items-center gap-2">
                  <RotateCw className="w-4 h-4" /> Click to flip
                </div>
              </div>

              {/* BACK (ANSWER) */}
              <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#0A192F] to-[#0033A0] rounded-3xl shadow-xl p-8 flex flex-col justify-center items-center text-center [backface-visibility:hidden] [transform:rotateY(180deg)] text-white">
                <CheckCircle2 className="w-16 h-16 text-[#FFD700] mb-6" />
                <p className="text-xl font-bold text-blue-200 mb-2">Correct Answer:</p>
                <h2 className="text-4xl font-black text-white leading-relaxed">
                  {questions[currentIndex][`option${questions[currentIndex].correctAnswer}`]}
                </h2>
                <div className="absolute bottom-6 text-sm font-bold text-blue-300 flex items-center gap-2">
                  <RotateCw className="w-4 h-4" /> Click to flip back
                </div>
              </div>

            </div>
          </div>

          {/* CONTROLS */}
          <div className="flex items-center gap-6 mt-8">
            <button 
              onClick={handlePrev} 
              disabled={currentIndex === 0}
              className="p-4 rounded-full bg-white border border-slate-200 shadow-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-all"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={handleNext} 
              disabled={currentIndex === questions.length - 1}
              className="p-4 rounded-full bg-[#0033A0] shadow-lg text-white hover:bg-[#002277] disabled:opacity-50 transition-all"
            >
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>

        </div>
      ) : null}

    </div>
  );
}
