"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Loader2, Clock, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// Helper function to shuffle array
const shuffleArray = (arr: any[]) => [...arr].sort(() => Math.random() - 0.5);

const shuffleQuestionsAndOptions = (questions: any[]) => {
  return shuffleArray(questions).map((q: any) => {
    const options = [
      { id: 'A', text: q.optionA },
      { id: 'B', text: q.optionB },
      { id: 'C', text: q.optionC },
      { id: 'D', text: q.optionD }
    ];
    
    const shuffledOptions = shuffleArray(options);
    const newCorrectIndex = shuffledOptions.findIndex(o => o.id === q.correctAnswer);
    const newLetters = ['A', 'B', 'C', 'D'];
    
    return {
      ...q,
      optionA: shuffledOptions[0].text,
      optionB: shuffledOptions[1].text,
      optionC: shuffledOptions[2].text,
      optionD: shuffledOptions[3].text,
      correctAnswer: newLetters[newCorrectIndex]
    };
  });
};

export default function TakeExamPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const examId = params.id as string;
  const studentId = searchParams.get('studentId') || '';

  const [questions, setQuestions] = useState<any[]>([]);
  const [examDetails, setExamDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [resultData, setResultData] = useState<any>(null);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!studentId) {
      router.push('/cbt');
      return;
    }

    const fetchQuestions = async () => {
      try {
        const [qRes, examRes] = await Promise.all([
          fetch(`/api/exams/questions?examId=${examId}`),
          fetch(`/api/exams`) 
        ]);
        
        const qData = await qRes.json();
        const examData = await examRes.json();

        if (qData.success) {
          // SHUFFLE QUESTIONS AND ANSWERS
          setQuestions(shuffleQuestionsAndOptions(qData.data));
        }

        if (examData.success) {
          const currentExam = examData.data.find((e: any) => e.id === examId);
          if (currentExam) {
            setExamDetails(currentExam);
            setTimeLeft(currentExam.durationMinutes * 60);
          }
        }
      } catch (err) {
        console.error("Failed to load exam");
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [examId, studentId, router]);

  useEffect(() => {
    if (timeLeft === null || isFinished || loading || questions.length === 0) return;

    if (timeLeft <= 0) {
      handleSubmitExam(true);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? prev - 1 : 0));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, isFinished, loading, questions]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSelectOption = (questionId: string, optionLetter: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionLetter }));
  };

  const handleSubmitExam = async (isAutoSubmit: boolean = false) => {
    if (!isAutoSubmit) {
      const isConfirmed = window.confirm("Are you sure you want to submit your exam? You cannot change your answers after submission.");
      if (!isConfirmed) return;
    }

    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const res = await fetch('/api/cbt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, examId, answers })
      });

      const data = await res.json();
      if (data.success) {
        setResultData(data.data);
        setIsFinished(true);
        window.scrollTo(0, 0);
      } else alert(data.error);
    } catch (err) {
      alert("Submission failed due to network error.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="fixed inset-0 bg-slate-50 flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-[#0033A0]" /></div>;

  if (isFinished && resultData) {
    const percentage = (resultData.score / resultData.totalMarks) * 100;
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md w-full text-center animation-fade-in">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="w-10 h-10 text-emerald-600" /></div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Examination Submitted!</h2>
          <p className="text-slate-500 mb-8">Your responses have been successfully recorded in the database.</p>
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 mb-8">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Your Score</p>
            <div className="flex items-end justify-center gap-2">
              <span className="text-5xl font-black text-slate-900">{resultData.score}</span>
              <span className="text-xl font-bold text-slate-400 mb-1">/ {resultData.totalMarks}</span>
            </div>
            <div className={`mt-4 inline-block px-4 py-1.5 rounded-full text-sm font-bold ${percentage >= 75 ? 'bg-emerald-100 text-emerald-800' : percentage >= 50 ? 'bg-[#0033A0]/20 text-[#0033A0]' : 'bg-red-100 text-red-800'}`}>
              {percentage.toFixed(1)}%
            </div>
          </div>
          <Link href="/cbt" className="block w-full bg-[#0A192F] hover:bg-[#060F1D] text-white font-bold py-3 rounded-xl transition-colors">Return to Portal</Link>
        </div>
      </div>
    );
  }

  const safeQuestions = questions.map(q => ({ ...q, section: q.section || 'English Studies' }));
  const sections = Array.from(new Set(safeQuestions.map(q => q.section)));
  
  const isTimeCritical = timeLeft !== null && timeLeft <= 300;

  return (
    <div className="bg-slate-50 min-h-screen pb-32">
      <div className="sticky top-0 bg-white border-b border-slate-200 shadow-sm z-50 px-4 py-4 md:px-8">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div><h1 className="font-black text-slate-900 text-lg md:text-xl">CBT Examination</h1><p className="text-xs md:text-sm font-bold text-[#0033A0]">{studentId}</p></div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${isTimeCritical ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' : 'bg-[#0A192F] text-white border-[#0A192F]'}`}>
            <Clock className="w-5 h-5" />
            <span className="font-mono font-bold tracking-wider text-lg">{timeLeft !== null ? formatTime(timeLeft) : '00:00'}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-8 space-y-12">
        {questions.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-slate-200 shadow-sm">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="font-bold text-lg text-slate-900">No questions available</h3>
            <p className="text-slate-500">This exam has not been configured by the admin yet.</p>
            <Link href="/cbt" className="mt-4 inline-block text-[#0033A0] font-bold hover:underline">Go Back</Link>
          </div>
        ) : (
          <>
            {sections.map((section) => (
              <div key={section as string} className="space-y-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{section as string}</h2>
                  <div className="flex-1 h-px bg-slate-300"></div>
                </div>

                <div className="space-y-6">
                  {safeQuestions.filter(q => q.section === section).map((q, index) => {
                    const isAnswered = !!answers[q.id];
                    return (
                      <div key={q.id} className={`bg-white rounded-2xl border-2 transition-all p-6 shadow-sm ${isAnswered ? 'border-[#0033A0]/50 shadow-md' : 'border-slate-200'}`}>
                        <div className="flex gap-4 mb-6">
                          <div className="shrink-0 w-8 h-8 rounded-full bg-slate-100 font-black text-slate-500 flex items-center justify-center border border-slate-200 text-sm">
                            {safeQuestions.findIndex(x => x.id === q.id) + 1}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 text-lg leading-relaxed pt-0.5 whitespace-pre-wrap">{q.text}</p>
                            {q.imageUrl && <img src={q.imageUrl} alt="Question diagram" className="max-h-48 object-contain mt-3 rounded-lg border border-slate-200" />}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-0 sm:pl-12">
                          {['A', 'B', 'C', 'D'].map((letter) => {
                            const optionText = q[`option${letter}`];
                            const isSelected = answers[q.id] === letter;
                            return (
                              <button key={letter} onClick={() => handleSelectOption(q.id, letter)} className={`text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${isSelected ? 'bg-[#0033A0]/10 border-[#0033A0] text-[#0033A0]' : 'bg-white border-slate-200 text-slate-600 hover:border-[#0033A0]/50 hover:bg-slate-50'}`}>
                                <div className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center mt-0.5 ${isSelected ? 'border-[#0033A0]' : 'border-slate-300'}`}>
                                  {isSelected && <div className="w-2.5 h-2.5 bg-[#0033A0] rounded-full"></div>}
                                </div>
                                <span className="font-medium text-[15px]">{optionText}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="pt-8 border-t-2 border-slate-200 flex justify-end">
              <button onClick={() => handleSubmitExam(false)} disabled={submitting || Object.keys(answers).length === 0} className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black text-lg px-12 py-5 rounded-2xl transition-all shadow-lg hover:shadow-xl flex items-center gap-3 disabled:cursor-not-allowed">
                {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                {submitting ? 'Submitting...' : 'Submit Examination'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
