import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type GeneratedNote = { lessonNote: string; evaluation: string; assignment: string };

function asText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  // Some models return a JSON array for evaluation/assignment despite being
  // asked for a string. Accept it instead of rejecting a useful draft.
  if (Array.isArray(value)) return value.map((item, index) => {
    if (typeof item === 'string') return item.trim() ? `${index + 1}. ${item.trim()}` : '';
    if (item && typeof item === 'object') {
      const text = (item as { question?: unknown; task?: unknown; text?: unknown });
      const part = text.question ?? text.task ?? text.text;
      return typeof part === 'string' && part.trim() ? `${index + 1}. ${part.trim()}` : '';
    }
    return '';
  }).filter(Boolean).join('\n');
  return '';
}

function extractSections(content: string): GeneratedNote | null {
  // JSON may be wrapped in Markdown fences. Evaluation/assignment may be
  // arrays or use common alternate key names.
  const candidate = content.match(/\{[\s\S]*\}/)?.[0];
  if (candidate) {
    try {
      const parsed = JSON.parse(candidate);
      const note = asText(parsed.lessonNote ?? parsed.lesson_note ?? parsed.lesson_notes ?? parsed.note);
      const evaluation = asText(parsed.evaluation ?? parsed.evaluationQuestions ?? parsed.questions);
      const assignment = asText(parsed.assignment ?? parsed.homework ?? parsed.assignments);
      if (note && evaluation && assignment) {
        return { lessonNote: note.slice(0, 30000), evaluation: evaluation.slice(0, 8000), assignment: assignment.slice(0, 8000) };
      }
    } catch { /* Try the headed text format before asking OpenAI again. */ }
  }
  // If a model disregards JSON but returns three clearly labelled sections,
  // keep the content rather than unnecessarily failing the first click.
  const heading = /^\s*(?:#{1,3}\s*)?(?:\*\*)?(LESSON\s+NOTES?|EVALUATION|ASSIGNMENT)(?:\*\*)?\s*:?\s*$/gim;
  const matches = [...content.matchAll(heading)];
  if (matches.length < 3) return null;
  const parts: Record<string, string> = {};
  for (let i = 0; i < matches.length; i++) {
    const key = matches[i][1].toUpperCase().startsWith('LESSON') ? 'lessonNote' : matches[i][1].toLowerCase();
    parts[key] = content.slice(matches[i].index! + matches[i][0].length, matches[i + 1]?.index ?? content.length).trim();
  }
  if (!parts.lessonNote || !parts.evaluation || !parts.assignment) return null;
  return {
    lessonNote: parts.lessonNote.slice(0, 30000),
    evaluation: parts.evaluation.slice(0, 8000),
    assignment: parts.assignment.slice(0, 8000)
  };
}

// Only this route is changed; Messaging, manual notes, files and saved notes
// remain untouched. Retry automatically only for incomplete AI output.
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !['STAFF', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Only teachers and admins can generate notes' }, { status: 403 });
    }
    const { subjectId, classId, topic, instructions = '' } = await req.json();
    if (typeof subjectId !== 'string' || typeof classId !== 'string' ||
        typeof topic !== 'string' || topic.trim().length < 2 || topic.length > 200 ||
        typeof instructions !== 'string' || instructions.length > 2000) {
      return NextResponse.json({ success: false, error: 'Choose a subject and class, enter a topic and optional instructions' }, { status: 400 });
    }
    const [subject, schoolClass] = await Promise.all([
      prisma.subject.findUnique({ where: { id: subjectId }, select: { name: true } }),
      prisma.class.findUnique({ where: { id: classId }, select: { name: true, level: true } })
    ]);
    if (!subject || !schoolClass) {
      return NextResponse.json({ success: false, error: 'Subject or class not found' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) return NextResponse.json({ success: false, error: 'OPENAI_API_KEY is not set in this deployment. Messaging may show a sample when the key is missing.' }, { status: 503 });
    const model = process.env.AI_MODEL || 'gpt-4o-mini';
    const signal = AbortSignal.timeout(50000); // Shared deadline, even if a retry is needed.
    for (let attempt = 0; attempt < 2; attempt++) {
      const shorter = attempt === 1;
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        signal,
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: shorter
              ? 'You are a Nigerian schoolteacher. Return ONLY valid JSON with three NONEMPTY string keys: lessonNote, evaluation, assignment. Keep the lesson note under 250 words, provide three numbered evaluation questions and two numbered assignment tasks. No Markdown fences.'
              : 'You are an experienced Nigerian schoolteacher. Return ONLY a JSON object with three nonempty string keys: lessonNote, evaluation, assignment. The lesson note should include objectives, clear explanation, examples and a recap. Evaluation should have numbered assessment questions and assignment numbered take-home tasks. Keep the total response concise. A teacher will review the draft before publishing.' },
            { role: 'user', content: `Subject: ${subject.name}\nClass: ${schoolClass.name} (${schoolClass.level})\nTopic: ${topic.trim()}\nTeacher instructions: ${instructions.trim() || 'Explain the topic clearly using familiar examples.'}\nReturn lessonNote, evaluation and assignment together.` }
          ],
          max_tokens: shorter ? 1700 : 2700,
          temperature: shorter ? 0.2 : 0.5
        })
      });
      if (!response.ok) {
        console.error('Lesson note OpenAI request failed', { status: response.status, model, attempt: attempt + 1 });
        const error = response.status === 401 || response.status === 403
          ? 'OpenAI rejected the configured key or project permissions. Check the Vercel production OPENAI_API_KEY.'
          : response.status === 429
            ? 'OpenAI rate limit or quota reached. Check your OpenAI billing and retry later.'
            : response.status === 400
              ? 'OpenAI rejected the request. Check that AI_MODEL in Vercel supports Chat Completions (try gpt-4o-mini).'
              : `OpenAI service returned HTTP ${response.status}. Please retry later.`;
        return NextResponse.json({ success: false, error }, { status: 502 });
      }
      const payload = await response.json();
      const choice = payload.choices?.[0];
      const content = choice?.message?.content;
      if (typeof content === 'string') {
        const sections = extractSections(content);
        if (sections) return NextResponse.json({ success: true, data: sections });
      }
      console.warn('Lesson note draft was incomplete', { model, attempt: attempt + 1, finishReason: choice?.finish_reason });
    }
    return NextResponse.json({ success: false, error: 'AI did not return a complete draft after two attempts. Please try a shorter topic or type the note manually.' }, { status: 502 });
  } catch (error) {
    console.error('Generate lesson note request failed:', error);
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return NextResponse.json({ success: false,
      error: timedOut ? 'OpenAI took too long to respond. Please retry.' : 'AI connection failed. Please retry or type the note manually.'
    }, { status: timedOut ? 504 : 502 });
  }
}
