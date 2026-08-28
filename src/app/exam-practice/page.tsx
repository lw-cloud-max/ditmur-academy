"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  BookOpen, Clock, CheckCircle2, XCircle, ArrowRight, ArrowLeft, 
  Loader2, Trophy, Target, BarChart3, Play, RotateCcw,
  Lightbulb, Award, GraduationCap, AlertCircle, Lock
} from 'lucide-react';

interface Question {
  id: string;
  questionNumber: number;
  text: string;
  imageUrl?: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  topic?: string;
  difficulty: string;
}

interface PracticeResult {
  questionId: string;
  questionText: string;
  questionNumber: number;
  options: { A: string; B: string; C: string; D: string };
  selectedAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  explanation?: string;
  topic?: string;
}

export default function ExamPracticePage() {
  const { data: session } = useSession();
  const studentId = session?.user?.id || '';
  const userRole = session?.user?.role || 'STAFF';

  // State
  const [examType, setExamType] = useState('JAMB');
  const [subject, setSubject] = useState('Mathematics');
  const [numberOfQuestions, setNumberOfQuestions] = useState(20);
  const [studentClass, setStudentClass] = useState('');
  const [isEligible, setIsEligible] = useState(false);
  const [eligibilityChecked, setEligibilityChecked] = useState(false);

  // Practice state
  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeTaken, setTimeTaken] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Results state
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<PracticeResult[]>([]);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [showExplanations, setShowExplanations] = useState(false);

  // History state
  const [practiceHistory, setPracticeHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Show loading while checking eligibility
  if (!eligibilityChecked) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0033A0]" />
      </div>
    );
  }

  // Show access denied for non-SS students
  if (!isEligible) {
    return (
      <div className="max-w-2xl mx-auto pb-32 animation-fade-in">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-3">Access Restricted</h2>
          <p className="text-slate-600 mb-2">
            JAMB, WAEC & NECO CBT Practice is only available for <strong>SS1, SS2, and SS3</strong> students.
          </p>
          <p className="text-sm text-slate-500 mb-6">
            Your current class: <span className="font-bold text-slate-700">{studentClass || 'Not assigned'}</span>
          </p>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Why?</strong> These exams are designed for senior secondary students preparing for their final exams. 
              Focus on building your foundation first, and you'll have access when you reach SS1!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Available subjects by exam type
  const subjectsByExam: Record<string, string[]> = {
    'JAMB': ['Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Government', 'Literature in English', 'Christian Religious Studies', 'Islamic Studies', 'Commerce', 'Accounting', 'Geography', 'History', 'Agricultural Science', 'Computer Studies'],
    'WAEC': ['Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Government', 'Literature in English', 'Christian Religious Studies', 'Islamic Studies', 'Commerce', 'Financial Accounting', 'Geography', 'History', 'Agricultural Science', 'Computer Studies', 'Further Mathematics', 'Technical Drawing'],
    'NECO': ['Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Government', 'Literature in English', 'Christian Religious Studies', 'Islamic Studies', 'Commerce', 'Financial Accounting', 'Geography', 'History', 'Agricultural Science', 'Computer Studies', 'Further Mathematics']
  };

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStarted && !showResults) {
      interval = setInterval(() => {
        setTimeTaken(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStarted, showResults]);

  // Check student eligibility on mount
  useEffect(() => {
    checkEligibility();
    fetchHistory();
  }, []);

  const checkEligibility = async () => {
    // Admin/Staff can always access
    if (userRole === 'ADMIN' || userRole === 'STAFF') {
      setIsEligible(true);
      setEligibilityChecked(true);
      return;
    }

    // Check if student is SS1-SS3
    try {
      const res = await fetch(`/api/students?studentId=${studentId}`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        const student = data.data[0];
        const className = student.class?.name || '';
        setStudentClass(className);
        
        // Check if class is SS1, SS2, or SS3
        const isSS = className.toLowerCase().includes('ss1') || 
                     className.toLowerCase().includes('ss2') || 
                     className.toLowerCase().includes('ss3') ||
                     className.toLowerCase().includes('senior secondary 1') ||
                     className.toLowerCase().includes('senior secondary 2') ||
                     className.toLowerCase().includes('senior secondary 3');
        
        setIsEligible(isSS);
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
    } finally {
      setEligibilityChecked(true);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/practice');
      const data = await res.json();
      if (data.success) {
        setPracticeHistory(data.data);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const startPractice = async () => {
    if (!subject) {
      alert('Please select a subject');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examType,
          subject,
          numberOfQuestions
        })
      });

      const data = await res.json();
      if (data.success) {
        setSessionId(data.data.sessionId);
        setQuestions(data.data.questions);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setTimeTaken(0);
        setIsStarted(true);
        setShowResults(false);
      } else {
        alert(data.error || 'No questions available for this selection. Please try another subject or exam type.');
      }
    } catch (error) {
      console.error('Error starting practice:', error);
      alert('Failed to start practice');
    } finally {
      setIsLoading(false);
    }
  };

  const selectAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const goToNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const submitPractice = async () => {
    const unanswered = questions.length - Object.keys(answers).length;
    if (unanswered > 0) {
      if (!confirm(`You have ${unanswered} unanswered questions. Are you sure you want to submit?`)) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const answersArray = Object.entries(answers).map(([questionId, selectedAnswer]) => ({
        questionId,
        selectedAnswer,
        timeTaken: 0
      }));

      const res = await fetch('/api/practice', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          answers: answersArray,
          timeTaken
        })
      });

      const data = await res.json();
      if (data.success) {
        setScore(data.data.score);
        setCorrectAnswers(data.data.correctAnswers);
        
        // Fetch detailed results
        const resultsRes = await fetch(`/api/practice?sessionId=${sessionId}`);
        const resultsData = await resultsRes.json();
        if (resultsData.success) {
          setResults(resultsData.data.results);
        }
        
        setShowResults(true);
        fetchHistory();
      } else {
        alert(data.error || 'Failed to submit');
      }
    } catch (error) {
      console.error('Error submitting:', error);
      alert('Failed to submit practice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPractice = () => {
    setIsStarted(false);
    setShowResults(false);
    setQuestions([]);
    setAnswers({});
    setSessionId('');
    setTimeTaken(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return 'bg-emerald-50 border-emerald-200';
    if (score >= 50) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  const currentQuestion = questions[currentQuestionIndex];

  // Results View
  if (showResults) {
    return (
      <div className="max-w-4xl mx-auto pb-32 animation-fade-in">
        {/* Score Card */}
        <div className={`rounded-2xl p-8 mb-8 border-2 ${getScoreBg(score)}`}>
          <div className="text-center">
            <Trophy className={`w-16 h-16 mx-auto mb-4 ${getScoreColor(score)}`} />
            <h2 className="text-3xl font-black text-slate-900 mb-2">Practice Complete!</h2>
            <p className={`text-5xl font-black mb-4 ${getScoreColor(score)}`}>{Math.round(score)}%</p>
            <div className="flex justify-center gap-8 text-sm">
              <div className="text-center">
                <p className="font-bold text-slate-900">{correctAnswers}/{questions.length}</p>
                <p className="text-slate-500">Correct</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-900">{formatTime(timeTaken)}</p>
                <p className="text-slate-500">Time Taken</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-900">{examType}</p>
                <p className="text-slate-500">{subject}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toggle Explanations */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-900">Review Answers</h3>
          <button
            onClick={() => setShowExplanations(!showExplanations)}
            className="px-4 py-2 bg-[#0033A0] text-white rounded-lg font-bold text-sm flex items-center gap-2"
          >
            <Lightbulb className="w-4 h-4" />
            {showExplanations ? 'Hide' : 'Show'} Explanations
          </button>
        </div>

        {/* Questions Review */}
        <div className="space-y-4">
          {results.map((result, index) => (
            <div key={result.questionId} className={`bg-white rounded-xl border p-6 ${
              result.isCorrect ? 'border-emerald-200' : 'border-red-200'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  result.isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                }`}>
                  {result.isCorrect ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900 mb-2">
                    Q{result.questionNumber}. {result.questionText}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {(['A', 'B', 'C', 'D'] as const).map(opt => (
                      <div key={opt} className={`p-2 rounded-lg text-sm ${
                        opt === result.correctAnswer 
                          ? 'bg-emerald-100 text-emerald-800 font-bold' 
                          : opt === result.selectedAnswer && !result.isCorrect
                          ? 'bg-red-100 text-red-800'
                          : 'bg-slate-50 text-slate-700'
                      }`}>
                        {opt}. {result.options[opt]}
                      </div>
                    ))}
                  </div>
                  {result.selectedAnswer && !result.isCorrect && (
                    <p className="text-sm text-red-600 mb-2">
                      Your answer: {result.selectedAnswer} | Correct: {result.correctAnswer}
                    </p>
                  )}
                  {showExplanations && result.explanation && (
                    <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-bold text-blue-800 mb-1">Explanation:</p>
                      <p className="text-sm text-blue-700 whitespace-pre-wrap">{result.explanation}</p>
                    </div>
                  )}
                  {result.topic && (
                    <span className="inline-block mt-2 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                      Topic: {result.topic}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={resetPractice}
            className="flex-1 px-6 py-4 bg-[#0033A0] text-white rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Practice Again
          </button>
          <button
            onClick={() => { setShowResults(false); setShowHistory(true); }}
            className="flex-1 px-6 py-4 bg-slate-100 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <BarChart3 className="w-5 h-5" />
            View History
          </button>
        </div>
      </div>
    );
  }

  // Practice View
  if (isStarted && currentQuestion) {
    return (
      <div className="max-w-4xl mx-auto pb-32 animation-fade-in">
        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-bold text-slate-900">{examType} - {subject}</h2>
              <p className="text-sm text-slate-500">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="font-mono font-bold">{formatTime(timeTaken)}</span>
              </div>
              <div className="text-sm text-slate-500">
                {Object.keys(answers).length}/{questions.length} answered
              </div>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#0033A0] transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 mb-6">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                Q{currentQuestion.questionNumber}
              </span>
              {currentQuestion.difficulty && (
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  currentQuestion.difficulty === 'EASY' ? 'bg-emerald-100 text-emerald-700' :
                  currentQuestion.difficulty === 'HARD' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {currentQuestion.difficulty}
                </span>
              )}
              {currentQuestion.topic && (
                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs">
                  {currentQuestion.topic}
                </span>
              )}
            </div>
            <p className="text-lg font-medium text-slate-900 leading-relaxed">
              {currentQuestion.text}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {(['A', 'B', 'C', 'D'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => selectAnswer(currentQuestion.id, opt)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  answers[currentQuestion.id] === opt
                    ? 'border-[#0033A0] bg-blue-50 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    answers[currentQuestion.id] === opt
                      ? 'bg-[#0033A0] text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {opt}
                  </div>
                  <span className="text-slate-700">{currentQuestion[`option${opt}` as keyof Question]}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={goToPrevious}
            disabled={currentQuestionIndex === 0}
            className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
          >
            <ArrowLeft className="w-5 h-5" />
            Previous
          </button>

          {/* Question Dots */}
          <div className="hidden md:flex gap-1">
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(i)}
                className={`w-8 h-8 rounded-lg text-xs font-bold ${
                  i === currentQuestionIndex
                    ? 'bg-[#0033A0] text-white'
                    : answers[q.id]
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {currentQuestionIndex === questions.length - 1 ? (
            <button
              onClick={submitPractice}
              disabled={isSubmitting}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              Submit
            </button>
          ) : (
            <button
              onClick={goToNext}
              className="px-6 py-3 bg-[#0033A0] text-white rounded-xl font-bold flex items-center gap-2"
            >
              Next
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // History View
  if (showHistory) {
    return (
      <div className="max-w-4xl mx-auto pb-32 animation-fade-in">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Practice History</h2>
          <button
            onClick={() => setShowHistory(false)}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm"
          >
            Back to Practice
          </button>
        </div>

        {practiceHistory.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-slate-200">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-700">No practice sessions yet</p>
            <p className="text-sm text-slate-500 mt-1">Start practicing to see your history here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {practiceHistory.map((session: any) => (
              <div key={session.id} className="bg-white rounded-xl border border-slate-200 p-4 flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-900">{session.examType} - {session.subject}</p>
                  <p className="text-sm text-slate-500">
                    {session.totalQuestions} questions • {formatTime(session.timeTaken)}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-black ${getScoreColor(session.score)}`}>
                    {Math.round(session.score)}%
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(session.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Setup View
  return (
    <div className="max-w-4xl mx-auto pb-32 animation-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-[#0033A0] to-[#002277] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <GraduationCap className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-2">JAMB, WAEC & NECO CBT Practice</h1>
        <p className="text-slate-500">Practice with past questions and improve your exam readiness</p>
      </div>

      {/* Exam Type Selection */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {['JAMB', 'WAEC', 'NECO'].map(type => (
          <button
            key={type}
            onClick={() => { setExamType(type); setSubject(subjectsByExam[type][0]); }}
            className={`p-6 rounded-xl border-2 transition-all ${
              examType === type
                ? 'border-[#0033A0] bg-blue-50 shadow-md'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <h3 className="font-black text-lg text-slate-900">{type}</h3>
            <p className="text-sm text-slate-500 mt-1">
              {type === 'JAMB' ? 'UTME' : 
               type === 'WAEC' ? 'WASSCE' : 
               'SSCE'}
            </p>
          </button>
        ))}
      </div>

      {/* Configuration */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        <h3 className="font-bold text-slate-900 mb-4">Configure Practice</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
            >
              {subjectsByExam[examType]?.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Number of Questions</label>
            <select
              value={numberOfQuestions}
              onChange={(e) => setNumberOfQuestions(parseInt(e.target.value))}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
            >
              <option value={10}>10 Questions</option>
              <option value={20}>20 Questions</option>
              <option value={30}>30 Questions</option>
              <option value={40}>40 Questions</option>
              <option value={50}>50 Questions</option>
            </select>
          </div>
        </div>
      </div>

      {/* Start Button */}
      <button
        onClick={startPractice}
        disabled={isLoading}
        className="w-full py-4 bg-gradient-to-r from-[#0033A0] to-[#002277] text-white rounded-xl font-black text-lg flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all"
      >
        {isLoading ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          <>
            <Play className="w-6 h-6" />
            Start CBT Practice
          </>
        )}
      </button>

      {/* History Button */}
      <button
        onClick={() => setShowHistory(true)}
        className="w-full mt-4 py-4 bg-slate-100 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2"
      >
        <BarChart3 className="w-5 h-5" />
        View Practice History
      </button>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
          <Target className="w-8 h-8 text-blue-600 mb-2" />
          <h4 className="font-bold text-blue-900">Real Exam Format</h4>
          <p className="text-sm text-blue-700">Practice with questions in the same format as actual JAMB, WAEC, and NECO exams</p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
          <Lightbulb className="w-8 h-8 text-emerald-600 mb-2" />
          <h4 className="font-bold text-emerald-900">Learn from Mistakes</h4>
          <p className="text-sm text-emerald-700">Get detailed explanations after completing each practice session</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
          <Award className="w-8 h-8 text-purple-600 mb-2" />
          <h4 className="font-bold text-purple-900">Track Your Progress</h4>
          <p className="text-sm text-purple-700">Monitor your scores and improvement over time</p>
        </div>
      </div>
    </div>
  );
}
