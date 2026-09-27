"use client";

import { useState, useEffect } from 'react';
import { Gamepad2, BrainCircuit, Loader2, ArrowRight, ArrowLeft, CheckCircle2, RotateCw, BookOpen, FileDown } from 'lucide-react';

type Subject = { id: string; name: string };
type Flashcard = { id: string; text: string; correctAnswer: 'A' | 'B' | 'C' | 'D'; optionA: string; optionB: string; optionC: string; optionD: string };
type StudyNote = { id: string; title: string; week: number; subject: Subject; class: Subject; fileName?: string | null; lessonNote?: string | null; evaluation?: string | null; assignment?: string | null; hasFile?: boolean };

export default function StudyHubPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [questions, setQuestions] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'notes' | 'flashcards'>('notes');
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<StudyNote | null>(null);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState('');

  // Flashcard State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    fetch('/api/subjects')
      .then(res => res.json())
      .then(data => {
        if (data.success) setSubjects(data.data);
        setLoading(false);
      }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedSubject || activeTab !== 'flashcards') return;
    let cancelled = false;
    fetch(`/api/question-bank?subjectId=${encodeURIComponent(selectedSubject)}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data.success) {
          // Shuffle the questions for a fresh study session
          setQuestions([...data.data].sort(() => Math.random() - 0.5));
          setCurrentIndex(0);
          setIsFlipped(false);
        }
        setLoading(false);
      }).catch(() => { if (!cancelled) { setQuestions([]); setLoading(false); } });
    return () => { cancelled = true; };
  }, [selectedSubject, activeTab]);

  useEffect(() => {
    if (!selectedSubject || activeTab !== 'notes') return;
    let cancelled = false;
    fetch(`/api/lesson-notes?subjectId=${encodeURIComponent(selectedSubject)}`, { cache: 'no-store' })
      .then(async res => {
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Could not load notes');
        if (!cancelled) setNotes(data.data);
      }).catch(error => { if (!cancelled) setNotesError(error.message); })
      .finally(() => { if (!cancelled) setNotesLoading(false); });
    return () => { cancelled = true; };
  }, [selectedSubject, activeTab]);

  const changeSubject = (subjectId: string) => {
    setSelectedSubject(subjectId); setSelectedNote(null); setNotes([]); setQuestions([]);
    setNotesError('');
    if (subjectId) {
      if (activeTab === 'notes') setNotesLoading(true);
      else setLoading(true);
    } else { setLoading(false); setNotesLoading(false); }
  };
  const switchTab = (tab: 'notes' | 'flashcards') => {
    setActiveTab(tab); setSelectedNote(null); setNotesError('');
    if (selectedSubject) {
      if (tab === 'notes') setNotesLoading(true);
      else setLoading(true);
    } else { setLoading(false); setNotesLoading(false); }
  };

  const viewNote = async (id: string) => {
    setNotesLoading(true); setNotesError('');
    try {
      const res = await fetch(`/api/lesson-notes?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not open note');
      setSelectedNote(data.data);
    } catch (error) {
      setNotesError(error instanceof Error ? error.message : 'Could not open note');
    } finally { setNotesLoading(false); }
  };

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
          <p className="text-slate-500">Read your class lesson notes and practise with interactive flashcards.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm" role="tablist" aria-label="Study resources">
        <button type="button" role="tab" aria-selected={activeTab === 'notes'} onClick={() => switchTab('notes')}
          className={`rounded-lg py-3 font-bold text-sm flex items-center justify-center gap-2 ${activeTab === 'notes' ? 'bg-[#0033A0] text-white' : 'text-slate-700'}`}>
          <BookOpen size={18} /> Lesson Notes
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'flashcards'} onClick={() => switchTab('flashcards')}
          className={`rounded-lg py-3 font-bold text-sm flex items-center justify-center gap-2 ${activeTab === 'flashcards' ? 'bg-[#0033A0] text-white' : 'text-slate-700'}`}>
          <Gamepad2 size={18} /> Flashcards
        </button>
      </div>
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Select Subject to Study</label>
        <select 
          value={selectedSubject} 
          onChange={(e) => changeSubject(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0033A0] font-bold text-[#0033A0]"
        >
          <option value="">-- Choose Subject --</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {activeTab === 'notes' ? (
        <div className="space-y-4">
          {notesError && <p role="alert" className="bg-red-50 rounded-xl p-4 text-red-700">{notesError}</p>}
          {!selectedSubject ? <div className="bg-white rounded-xl border p-8 text-center text-slate-600">Choose a subject to see notes published for your class.</div>
          : notesLoading ? <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-700" /></div>
          : selectedNote ? <article className="bg-white rounded-xl border p-4 sm:p-6 space-y-5">
              <button type="button" onClick={() => setSelectedNote(null)} className="text-blue-700 font-bold text-sm">← All notes</button>
              <div><h2 className="text-xl font-bold text-slate-900">{selectedNote.title}</h2>
                <p className="text-sm text-slate-600">{selectedNote.subject.name} · {selectedNote.class.name} · Week {selectedNote.week}</p></div>
              {selectedNote.lessonNote && <section><h3 className="font-bold mb-2 text-blue-900">Lesson note</h3><p className="whitespace-pre-wrap break-words leading-relaxed text-slate-800">{selectedNote.lessonNote}</p></section>}
              {selectedNote.hasFile && <a href={`/api/lesson-notes/${encodeURIComponent(selectedNote.id)}/file`}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-800 text-white px-4 py-3 font-bold"><FileDown size={18} /> Download {selectedNote.fileName}</a>}
              {selectedNote.evaluation && <section className="rounded-xl bg-blue-50 p-4"><h3 className="font-bold text-blue-900 mb-2">Evaluation</h3><p className="whitespace-pre-wrap break-words">{selectedNote.evaluation}</p></section>}
              {selectedNote.assignment && <section className="rounded-xl bg-amber-50 p-4"><h3 className="font-bold text-amber-900 mb-2">Assignment</h3><p className="whitespace-pre-wrap break-words">{selectedNote.assignment}</p></section>}
            </article>
          : notes.length === 0 ? <div className="bg-white rounded-xl border p-8 text-center text-slate-600">No lesson notes published for this subject and your class yet.</div>
          : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{notes.map(note => <button key={note.id} type="button" onClick={() => viewNote(note.id)}
              className="text-left bg-white rounded-xl border p-5 shadow-sm hover:border-blue-400 min-h-28">
              <h3 className="font-bold text-slate-900">{note.title}</h3>
              <p className="text-sm text-slate-600 mt-1">{note.subject.name} · Week {note.week}</p>
              {note.fileName && <p className="text-xs text-blue-800 mt-2">Includes a downloadable file</p>}
            </button>)}</div>}
        </div>
      ) : loading ? (
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
