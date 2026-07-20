"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Lightbulb, Quote, Send, Loader2, Sparkles, CheckCircle2, Trophy, Clock, BrainCircuit, Shield } from 'lucide-react';

export default function TriviaPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isStudent = userRole === 'STUDENT';

  // --- ADMIN STATE ---
  const [subject, setSubject] = useState('Science');
  const [generating, setGenerating] = useState(false);
  const [trivia, setTrivia] = useState<{fact: string, quote: string} | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [success, setSuccess] = useState(false);

  // --- STUDENT STATE ---
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds for 5 questions
  const [quizFinished, setQuizFinished] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  // Mock AI Generated Quiz Questions
  const quizQuestions = [
    {
      q: "What is the capital of Nigeria?",
      options: ["Lagos", "Abuja", "Kano", "Port Harcourt"],
      answer: 1
    },
    {
      q: "Which planet is known as the Red Planet?",
      options: ["Venus", "Mars", "Jupiter", "Saturn"],
      answer: 1
    },
    {
      q: "What is the chemical symbol for Gold?",
      options: ["Ag", "Go", "Au", "Gd"],
      answer: 2
    },
    {
      q: "Who wrote 'Things Fall Apart'?",
      options: ["Wole Soyinka", "Chimamanda Ngozi Adichie", "Chinua Achebe", "Buchi Emecheta"],
      answer: 2
    },
    {
      q: "What is the largest organ in the human body?",
      options: ["Heart", "Brain", "Liver", "Skin"],
      answer: 3
    }
  ];

  // Admin Handlers
  const handleGenerate = async () => {
    setGenerating(true);
    setSuccess(false);
    try {
      const res = await fetch('/api/ai/trivia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject })
      });
      const data = await res.json();
      if (data.success) {
        setTrivia(data.data);
      }
    } catch (err) {
      alert("Failed to generate trivia");
    } finally {
      setGenerating(false);
    }
  };

  const handleBroadcast = () => {
    setBroadcasting(true);
    setTimeout(() => {
      setBroadcasting(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    }, 1500);
  };

  // Student Quiz Handlers
  useEffect(() => {
    if (quizStarted && timeLeft > 0 && !quizFinished) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !quizFinished) {
      setQuizFinished(true);
    }
  }, [timeLeft, quizStarted, quizFinished]);

  const startQuiz = () => {
    setQuizStarted(true);
    setScore(0);
    setCurrentQuestion(0);
    setTimeLeft(60);
    setQuizFinished(false);
    setSelectedAnswer(null);
  };

  const handleAnswer = (index: number) => {
    setSelectedAnswer(index);
    setTimeout(() => {
      if (index === quizQuestions[currentQuestion].answer) {
        setScore(score + 1);
      }
      
      if (currentQuestion < quizQuestions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
      } else {
        setQuizFinished(true);
      }
    }, 800);
  };

  if (isStudent) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-32 animation-fade-in">
        <div className="bg-[#0A192F] rounded-3xl p-8 relative overflow-hidden shadow-lg text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700] rounded-full blur-3xl opacity-20 -mr-20 -mt-20"></div>
          <div className="relative z-10 flex items-center gap-4">
            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
              <BrainCircuit className="w-10 h-10 text-[#FFD700]" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">Daily Trivia Challenge</h1>
              <p className="text-blue-200 mt-1">Test your knowledge, beat the clock, and earn the Trivia Master badge!</p>
            </div>
          </div>
        </div>

        {!quizStarted && !quizFinished && (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm text-center">
            <Shield className="w-20 h-20 text-[#0033A0] mx-auto mb-6 opacity-20" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Ready for today's challenge?</h2>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">You have 60 seconds to answer 5 random questions. Get a perfect score to unlock today's badge.</p>
            <button onClick={startQuiz} className="bg-[#0033A0] text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#002277] transition-all hover:shadow-lg hover:-translate-y-1">
              Start Quiz Now
            </button>
          </div>
        )}

        {quizStarted && !quizFinished && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Question {currentQuestion + 1} of {quizQuestions.length}</span>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold ${timeLeft <= 10 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-blue-50 text-[#0033A0]'}`}>
                <Clock className="w-5 h-5" />
                <span className="text-lg">0:{timeLeft.toString().padStart(2, '0')}</span>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-8">{quizQuestions[currentQuestion].q}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizQuestions[currentQuestion].options.map((opt, idx) => {
                let btnClass = "p-5 rounded-xl border-2 text-left font-semibold transition-all ";
                
                if (selectedAnswer === null) {
                  btnClass += "border-slate-200 hover:border-[#0033A0] hover:bg-blue-50 text-slate-700";
                } else {
                  if (idx === quizQuestions[currentQuestion].answer) {
                    btnClass += "border-emerald-500 bg-emerald-50 text-emerald-700";
                  } else if (idx === selectedAnswer) {
                    btnClass += "border-red-500 bg-red-50 text-red-700";
                  } else {
                    btnClass += "border-slate-200 text-slate-400 opacity-50";
                  }
                }

                return (
                  <button 
                    key={idx} 
                    disabled={selectedAnswer !== null}
                    onClick={() => handleAnswer(idx)}
                    className={btnClass}
                  >
                    <span className="inline-block w-8 h-8 text-center leading-8 rounded-lg bg-white shadow-sm border border-slate-200 mr-3 text-slate-500">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {quizFinished && (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm text-center animation-fade-in">
            {score === 5 ? (
              <div className="mb-6 relative inline-block">
                <div className="absolute inset-0 bg-yellow-400 blur-2xl opacity-40 rounded-full animate-pulse"></div>
                <Trophy className="w-24 h-24 text-[#FFD700] mx-auto relative z-10" />
              </div>
            ) : (
              <BrainCircuit className="w-20 h-20 text-slate-300 mx-auto mb-6" />
            )}
            
            <h2 className="text-3xl font-black text-slate-900 mb-2">
              {score === 5 ? 'Perfect Score!' : 'Quiz Complete!'}
            </h2>
            <p className="text-slate-500 mb-8 text-lg">You scored <span className="font-bold text-[#0033A0]">{score}</span> out of {quizQuestions.length}</p>
            
            {score === 5 && (
              <div className="inline-flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-800 px-6 py-3 rounded-xl font-bold mb-8">
                <Sparkles className="w-5 h-5 text-yellow-600" />
                Trivia Master Badge Unlocked!
              </div>
            )}
            <br />
            <button onClick={startQuiz} className="text-[#0033A0] font-bold hover:underline">
              Try Again Tomorrow (or click here to reset for testing)
            </button>
          </div>
        )}
      </div>
    );
  }

  // --- ADMIN / STAFF VIEW ---
  return (
    <div className="space-y-6 pb-32 max-w-5xl mx-auto animation-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Daily Trivia & Facts</h1>
          <p className="text-slate-500">Generate and broadcast daily educational content to students.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#0033A0]" /> Content Generator
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subject Area</label>
              <select 
                value={subject} onChange={e => setSubject(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0] font-medium"
              >
                <option value="Science">Science & Nature</option>
                <option value="History">World History</option>
                <option value="Literature">Literature & Arts</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Geography">Geography</option>
              </select>
            </div>
            
            <button 
              onClick={handleGenerate} disabled={generating}
              className="w-full flex justify-center items-center gap-2 bg-[#0033A0] text-white px-4 py-3 rounded-xl hover:bg-[#002277] font-bold transition-all disabled:opacity-70"
            >
              {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lightbulb className="w-5 h-5" />}
              {generating ? 'Generating AI Content...' : 'Generate New Content'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {!trivia ? (
            <div className="bg-white rounded-2xl border border-slate-200 border-dashed p-12 text-center">
              <Lightbulb className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-700">No Content Generated</h3>
              <p className="text-sm text-slate-500 mt-1">Select a subject and click generate to create today's trivia.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-[#0A192F] to-[#0033A0] rounded-2xl p-8 text-white relative overflow-hidden shadow-lg">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                  <Lightbulb className="w-32 h-32" />
                </div>
                <div className="relative z-10">
                  <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-bold tracking-wider mb-4 uppercase">Fact of the Day</span>
                  <p className="text-xl md:text-2xl font-medium leading-relaxed">{trivia.fact}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm relative">
                <Quote className="w-12 h-12 text-blue-50 absolute top-4 left-4" />
                <div className="relative z-10 pl-6 border-l-4 border-[#0033A0]">
                  <p className="text-lg md:text-xl font-medium text-slate-700 italic mb-4">{trivia.quote}</p>
                  <p className="font-bold text-slate-900">— AI Generated Inspiration</p>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-slate-200">
                <button 
                  onClick={handleBroadcast} disabled={broadcasting || success}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3.5 rounded-xl hover:bg-emerald-700 font-bold transition-all disabled:opacity-70"
                >
                  {broadcasting ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                   success ? <CheckCircle2 className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                  {broadcasting ? 'Broadcasting...' : 
                   success ? 'Broadcast Sent!' : 'Broadcast to All Students'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
