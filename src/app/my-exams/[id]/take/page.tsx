"use client";

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Loader2, Send } from 'lucide-react';

type Question = {
  id: string; text: string; questionNumber: number; marks: number; imageUrl?: string | null;
  optionA: string; optionB: string; optionC: string; optionD: string;
};
type Sitting = {
  attemptId: string; startedAt: string;
  exam: { title: string; durationMinutes: number; totalMarks: number; showResults: boolean };
  questions: Question[];
};

export default function TakeExam() {
  const params = useParams();
  const examId = String(params.id);
  const [sitting, setSitting] = useState<Sitting | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ score?: number; totalMarks?: number; isPassed?: boolean } | null>(null);
  const submittingRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      try {
        const res = await fetch('/api/internal-exams-new/take', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ examId })
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.success) throw new Error(data.error || 'Unable to start exam');
        const current: Sitting = data.data;
        setSitting(current);
        try {
          const saved = localStorage.getItem(`ditmur-answers-${current.attemptId}`);
          if (saved) setAnswers(JSON.parse(saved));
        } catch { /* Private browsing: answers remain in memory. */ }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to start exam');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    start();
    return () => { cancelled = true; };
  }, [examId]);

  useEffect(() => {
    if (!sitting || result) return;
    const tick = () => setSecondsLeft(Math.max(0,
      Math.ceil((new Date(sitting.startedAt).getTime() + sitting.exam.durationMinutes * 60000 - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [sitting, result]);

  const submit = async (automatic = false) => {
    if (!sitting || submittingRef.current || result) return;
    if (!automatic && !window.confirm('Submit your exam now? You cannot change your answers afterward.')) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/internal-exams-new/take', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: sitting.attemptId,
          answers: Object.entries(answersRef.current).map(([questionId, selectedAnswer]) => ({ questionId, selectedAnswer }))
        })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not submit exam');
      try { localStorage.removeItem(`ditmur-answers-${sitting.attemptId}`); } catch { /* no storage */ }
      setResult(data.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit exam. Please try again.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (secondsLeft === 0 && sitting && !result && !submittingRef.current) submit(true);
    // Do not re-submit on each answer change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, sitting, result]);

  const choose = (questionId: string, option: string) => {
    setAnswers(previous => {
      const next = { ...previous, [questionId]: option };
      if (sitting) {
        try { localStorage.setItem(`ditmur-answers-${sitting.attemptId}`, JSON.stringify(next)); } catch { /* no storage */ }
      }
      return next;
    });
  };

  if (loading) return <div className="flex justify-center p-16"><Loader2 className="animate-spin text-blue-700" /></div>;
  if (!sitting) return <div className="max-w-xl mx-auto p-6 bg-white rounded-xl border">
    <h1 className="text-xl font-bold mb-3">Exam unavailable</h1><p role="alert" className="text-red-700 mb-5">{error}</p>
    <Link href="/my-exams" className="text-blue-700 font-bold">← Back to My Exams</Link>
  </div>;
  if (result) return <div className="max-w-xl mx-auto p-6 bg-white rounded-xl border text-center">
    <h1 className="text-2xl font-bold mb-3">Exam submitted</h1>
    {sitting.exam.showResults && result.score !== undefined
      ? <p className="mb-5 text-lg">Score: {result.score}/{result.totalMarks} — {result.isPassed ? 'Passed' : 'Not passed'}</p>
      : <p className="mb-5 text-slate-600">Your teacher will release the results when ready.</p>}
    <Link href="/my-exams" className="inline-block rounded-lg bg-blue-800 px-5 py-3 text-white font-bold">Back to My Exams</Link>
  </div>;

  return <div className="max-w-3xl mx-auto pb-32 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl p-4 border shadow-sm">
      <div><Link href="/my-exams" className="inline-flex items-center gap-1 text-sm text-blue-700 mb-2"><ArrowLeft size={16} /> My Exams</Link>
        <h1 className="text-xl font-bold">{sitting.exam.title}</h1>
        <p className="text-sm text-slate-500">{Object.keys(answers).length}/{sitting.questions.length} answered</p></div>
      <span className={`flex items-center gap-2 rounded-lg px-4 py-2 font-bold ${secondsLeft === 0 ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-800'}`}>
        <Clock size={18} /> {secondsLeft === null ? '…' : `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`}
      </span>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}
    {sitting.questions.map((q, index) => <section key={q.id} className="bg-white rounded-xl border p-4 sm:p-6 shadow-sm">
      <h2 className="font-semibold mb-4">{index + 1}. {q.text} <span className="text-slate-500 text-sm">({q.marks} marks)</span></h2>
      {q.imageUrl && <img src={q.imageUrl} alt={`Question ${index + 1}`} className="max-h-64 max-w-full object-contain mb-4" />}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {(['A','B','C','D'] as const).map(letter => <button key={letter} type="button" disabled={submitting || secondsLeft === 0}
          aria-pressed={answers[q.id] === letter}
          onClick={() => choose(q.id, letter)}
          className={`text-left p-3 rounded-lg border-2 min-h-12 ${answers[q.id] === letter ? 'border-blue-700 bg-blue-50 text-blue-900' : 'border-slate-200 hover:border-blue-300'}`}>
          <span className="font-bold mr-2">{letter}.</span>{q[`option${letter}`]}
        </button>)}
      </div>
    </section>)}
    <button type="button" onClick={() => submit()} disabled={submitting}
      className="w-full py-4 rounded-xl bg-blue-800 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60">
      {submitting ? <Loader2 className="animate-spin" /> : <Send size={20} />} Submit exam
    </button>
  </div>;
}
