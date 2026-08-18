"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  BrainCircuit,
  Loader2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  RotateCw,
  Gamepad2,
  Clock3,
  Trophy,
  Sparkles,
  BookOpenText,
  ShieldCheck,
} from 'lucide-react';

type Question = {
  id: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  subject?: { name?: string };
};

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const shuffleArray = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

const getQuestionOptions = (question: Question) => [
  { label: 'A', value: question.optionA },
  { label: 'B', value: question.optionB },
  { label: 'C', value: question.optionC },
  { label: 'D', value: question.optionD },
];

const getCorrectIndex = (question: Question) => {
  const answer = (question.correctAnswer || 'A').toUpperCase();
  return OPTION_LABELS.indexOf(answer);
};

export default function StudyHubPage() {
  const { data: session } = useSession();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMode, setActiveMode] = useState<'flashcards' | 'quiz'>('flashcards');
  const [savedResult, setSavedResult] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const [quizStarted, setQuizStarted] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(180);
  const [review, setReview] = useState<Array<{ question: Question; selectedIndex: number | null; isCorrect: boolean }>>([]);

  const quizQuestions = questions.slice(0, Math.min(questions.length, 10));
  const currentQuestion = quizQuestions[currentQuestionIndex] ?? null;
  const percentage = quizQuestions.length ? Math.round((score / quizQuestions.length) * 100) : 0;

  const persistQuizResult = async (resultScore: number, totalQuestions: number) => {
    if (!selectedSubject) return;

    const studentId = session?.user?.id ? String(session.user.id).toUpperCase().trim() : '';
    const resultPercentage = totalQuestions ? Math.round((resultScore / totalQuestions) * 100) : 0;

    if (studentId) {
      try {
        await fetch('/api/study-results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId,
            subjectId: selectedSubject,
            score: resultScore,
            totalQuestions,
            percentage: resultPercentage,
          }),
        });
        return;
      } catch (error) {
        console.error('Failed to save study result to server:', error);
      }
    }

    const subjectName = subjects.find((subject) => subject.id === selectedSubject)?.name || 'Unknown Subject';
    const resultEntry = {
      id: `${studentId || 'guest'}-${selectedSubject}-${Date.now()}`,
      studentId,
      subjectId: selectedSubject,
      subjectName,
      score: resultScore,
      total: totalQuestions,
      percentage: resultPercentage,
      completedAt: new Date().toISOString(),
    };

    try {
      const existing = JSON.parse(localStorage.getItem('studyQuizResults') || '[]') as Array<typeof resultEntry>;
      const updated = [resultEntry, ...existing].slice(0, 20);
      localStorage.setItem('studyQuizResults', JSON.stringify(updated));
    } catch (error) {
      console.error('Unable to save quiz result locally:', error);
    }
  };

  useEffect(() => {
    if (!selectedSubject) {
      setSavedResult(false);
    }
  }, [selectedSubject]);

  useEffect(() => {
    if (activeMode === 'quiz' && quizStarted && timeLeft === 0 && !quizFinished) {
      setQuizFinished(true);
      setQuizStarted(false);
      setSelectedAnswer(null);
      setSavedResult(false);
      void persistQuizResult(score, quizQuestions.length);
      setSavedResult(true);
    }
  }, [activeMode, quizStarted, timeLeft, quizFinished, score, quizQuestions.length]);

  useEffect(() => {
    fetch('/api/subjects')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setSubjects(data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedSubject) {
      setQuestions([]);
      setQuizStarted(false);
      setQuizFinished(false);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setReview([]);
      setScore(0);
      return;
    }

    setLoading(true);
    fetch(`/api/question-bank?subjectId=${selectedSubject}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const sorted = shuffleArray<Question>((data.data as Question[]) || []);
          setQuestions(sorted);
          setCurrentIndex(0);
          setIsFlipped(false);
          setQuizStarted(false);
          setQuizFinished(false);
          setCurrentQuestionIndex(0);
          setSelectedAnswer(null);
          setReview([]);
          setScore(0);
          setTimeLeft(180);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedSubject]);

  useEffect(() => {
    if (activeMode !== 'quiz' || !quizStarted || quizFinished || timeLeft <= 0) return;

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [activeMode, quizStarted, quizFinished, timeLeft]);

  useEffect(() => {
    if (activeMode === 'quiz' && quizStarted && timeLeft === 0 && !quizFinished) {
      setQuizFinished(true);
      setQuizStarted(false);
      setSelectedAnswer(null);
    }
  }, [activeMode, quizStarted, timeLeft, quizFinished]);

  const handleNextFlashcard = () => {
    if (currentIndex < questions.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex((prev) => prev + 1), 150);
    }
  };

  const handlePrevFlashcard = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex((prev) => prev - 1), 150);
    }
  };

  const startQuiz = () => {
    if (!selectedSubject || !questions.length) return;

    const totalQuestions = Math.min(questions.length, 10);
    setActiveMode('quiz');
    setQuizStarted(true);
    setQuizFinished(false);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setReview([]);
    setSavedResult(false);
    setTimeLeft(Math.max(60, totalQuestions * 12));
  };

  const finishQuiz = async (finalScore: number) => {
    setQuizStarted(false);
    setQuizFinished(true);
    setSelectedAnswer(null);
    setSavedResult(false);
    await persistQuizResult(finalScore, quizQuestions.length);
    setSavedResult(true);
  };

  const handleAnswer = (index: number) => {
    if (!currentQuestion || selectedAnswer !== null || !quizStarted) return;

    const correctIndex = getCorrectIndex(currentQuestion);
    const isCorrect = index === correctIndex;

    setSelectedAnswer(index);
    setReview((prev) => [
      ...prev,
      {
        question: currentQuestion,
        selectedIndex: index,
        isCorrect,
      },
    ]);

    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    setTimeout(() => {
      const nextScore = isCorrect ? score + 1 : score;

      if (currentQuestionIndex < quizQuestions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
        setSelectedAnswer(null);
      } else {
        void finishQuiz(nextScore);
      }
    }, 850);
  };

  if (loading && !selectedSubject) {
    return (
      <div className="p-24 flex justify-center">
        <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin" />
      </div>
    );
  }

  const selectedSubjectName = subjects.find((subject) => subject.id === selectedSubject)?.name || 'Selected Subject';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-32">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Study Hub</h1>
          <p className="text-slate-500">Revise with flashcards or challenge yourself with a timed quiz.</p>
        </div>

        <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setActiveMode('flashcards')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeMode === 'flashcards'
                ? 'bg-[#0033A0] text-white shadow-sm'
                : 'text-slate-600 hover:text-[#0033A0]'
            }`}
          >
            <span className="flex items-center gap-2"><BookOpenText className="w-4 h-4" /> Flashcards</span>
          </button>
          <button
            onClick={() => setActiveMode('quiz')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeMode === 'quiz'
                ? 'bg-[#0033A0] text-white shadow-sm'
                : 'text-slate-600 hover:text-[#0033A0]'
            }`}
          >
            <span className="flex items-center gap-2"><Gamepad2 className="w-4 h-4" /> Quiz</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Select Subject</label>
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0033A0] font-bold text-[#0033A0]"
        >
          <option value="">-- Choose Subject --</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>{subject.name}</option>
          ))}
        </select>
      </div>

      {!selectedSubject ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <BrainCircuit className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">Pick a subject to begin</h3>
          <p className="text-slate-500">Choose any subject to start studying or take a quick quiz.</p>
        </div>
      ) : loading ? (
        <div className="p-24 flex justify-center">
          <Loader2 className="w-12 h-12 text-[#0033A0] animate-spin" />
        </div>
      ) : selectedSubject && questions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <BrainCircuit className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No questions found</h3>
          <p className="text-slate-500">The question bank for {selectedSubjectName} is currently empty.</p>
        </div>
      ) : activeMode === 'flashcards' ? (
        <div className="flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4 text-sm font-bold text-slate-500 uppercase tracking-widest">
            <span>Card {currentIndex + 1} of {questions.length}</span>
            <span>{selectedSubjectName}</span>
          </div>

          <div
            className="relative w-full max-w-2xl h-96 [perspective:1000px] cursor-pointer"
            onClick={() => setIsFlipped((prev) => !prev)}
          >
            <div
              className={`w-full h-full transition-all duration-500 [transform-style:preserve-3d] ${
                isFlipped ? '[transform:rotateY(180deg)]' : ''
              }`}
            >
              <div className="absolute inset-0 w-full h-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 flex flex-col justify-center items-center text-center [backface-visibility:hidden]">
                <BrainCircuit className="w-10 h-10 text-blue-200 absolute top-6 left-6" />
                <h2 className="text-3xl font-black text-slate-900 leading-relaxed whitespace-pre-wrap px-8">
                  {questions[currentIndex]?.text}
                </h2>
                <div className="absolute bottom-6 text-sm font-bold text-slate-400 flex items-center gap-2">
                  <RotateCw className="w-4 h-4" /> Click to flip
                </div>
              </div>

              <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#0A192F] to-[#0033A0] rounded-3xl shadow-xl p-8 flex flex-col justify-center items-center text-center [backface-visibility:hidden] [transform:rotateY(180deg)] text-white">
                <CheckCircle2 className="w-16 h-16 text-[#FFD700] mb-6" />
                <p className="text-xl font-bold text-blue-200 mb-2">Correct Answer</p>
                <h2 className="text-4xl font-black text-white leading-relaxed">
                  {getQuestionOptions(questions[currentIndex])[getCorrectIndex(questions[currentIndex])]?.value}
                </h2>
                <div className="absolute bottom-6 text-sm font-bold text-blue-300 flex items-center gap-2">
                  <RotateCw className="w-4 h-4" /> Click to flip back
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 mt-8">
            <button
              onClick={handlePrevFlashcard}
              disabled={currentIndex === 0}
              className="p-4 rounded-full bg-white border border-slate-200 shadow-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-all"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <button
              onClick={handleNextFlashcard}
              disabled={currentIndex === questions.length - 1}
              className="p-4 rounded-full bg-[#0033A0] shadow-lg text-white hover:bg-[#002277] disabled:opacity-50 transition-all"
            >
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      ) : quizQuestions.length > 0 ? (
        <div className="space-y-6">
          {!quizStarted && !quizFinished ? (
            <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm text-center">
              <ShieldCheck className="w-20 h-20 text-[#0033A0] mx-auto mb-6 opacity-20" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Ready for your quiz?</h2>
              <p className="text-slate-500 mb-8 max-w-md mx-auto">
                You have {Math.max(60, quizQuestions.length * 12)} seconds to answer up to {quizQuestions.length} questions.
              </p>
              <button
                onClick={startQuiz}
                className="bg-[#0033A0] text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#002277] transition-all hover:shadow-lg hover:-translate-y-1"
              >
                Start Quiz
              </button>
            </div>
          ) : quizStarted && currentQuestion ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                    Question {currentQuestionIndex + 1} of {quizQuestions.length}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold ${
                    timeLeft <= 10 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-blue-50 text-[#0033A0]'
                  }`}
                >
                  <Clock3 className="w-5 h-5" />
                  <span className="text-lg">{timeLeft}s</span>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-slate-900 mb-8">{currentQuestion.text}</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getQuestionOptions(currentQuestion).map((option, index) => {
                  const isCorrect = index === getCorrectIndex(currentQuestion);
                  let buttonClass = 'p-5 rounded-xl border-2 text-left font-semibold transition-all ';

                  if (selectedAnswer === null) {
                    buttonClass += 'border-slate-200 hover:border-[#0033A0] hover:bg-blue-50 text-slate-700';
                  } else if (isCorrect) {
                    buttonClass += 'border-emerald-500 bg-emerald-50 text-emerald-700';
                  } else if (selectedAnswer === index) {
                    buttonClass += 'border-red-500 bg-red-50 text-red-700';
                  } else {
                    buttonClass += 'border-slate-200 text-slate-400 opacity-50';
                  }

                  return (
                    <button
                      key={option.label}
                      onClick={() => handleAnswer(index)}
                      disabled={selectedAnswer !== null}
                      className={buttonClass}
                    >
                      <span className="inline-block w-8 h-8 text-center leading-8 rounded-lg bg-white shadow-sm border border-slate-200 mr-3 text-slate-500">
                        {option.label}
                      </span>
                      {option.value}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : quizFinished ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm text-center animation-fade-in">
              {score === quizQuestions.length ? (
                <div className="mb-6 relative inline-block">
                  <div className="absolute inset-0 bg-yellow-400 blur-2xl opacity-40 rounded-full animate-pulse"></div>
                  <Trophy className="w-24 h-24 text-[#FFD700] mx-auto relative z-10" />
                </div>
              ) : (
                <Sparkles className="w-20 h-20 text-slate-300 mx-auto mb-6" />
              )}

              <h2 className="text-3xl font-black text-slate-900 mb-2">
                {score === quizQuestions.length ? 'Perfect score!' : 'Quiz complete!'}
              </h2>
              <p className="text-slate-500 mb-6 text-lg">
                You scored <span className="font-bold text-[#0033A0]">{score}</span> out of {quizQuestions.length}
              </p>

              <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-[#0033A0] px-6 py-3 rounded-xl font-bold mb-8">
                <ShieldCheck className="w-5 h-5" />
                Score: {percentage}%
              </div>

              <div className="space-y-3 text-left mx-auto max-w-2xl">
                {quizQuestions.map((question, index) => {
                  const result = review.find((item) => item.question.id === question.id);
                  const correctIndex = getCorrectIndex(question);
                  const correctAnswer = getQuestionOptions(question)[correctIndex]?.value;
                  const selectedValue =
                    result && result.selectedIndex !== null
                      ? getQuestionOptions(question)[result.selectedIndex]?.value
                      : 'No answer';

                  return (
                    <div key={question.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <p className="font-bold text-slate-800 mb-2">
                        {index + 1}. {question.text}
                      </p>
                      <p className={`text-sm ${result?.isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                        Your answer: {selectedValue}
                      </p>
                      <p className="text-sm text-slate-600">Correct answer: {correctAnswer}</p>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={startQuiz}
                className="mt-8 text-[#0033A0] font-bold hover:underline"
              >
                Try again
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
