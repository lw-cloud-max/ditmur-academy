import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type GeneratedNote = { lessonNote: string; evaluation: string; assignment: string };

function extractSections(content: string): GeneratedNote | null {
  // Some models wrap JSON in ```json ... ``` despite being asked not to.
  const candidate = content.match(/\{[\s\S]*\}/)?.[0];
  if (!candidate) return null;
  try {
    const parsed = JSON.parse(candidate);
    const note = parsed.lessonNote ?? parsed.lesson_note ?? parsed.note;
    const evaluation = parsed.evaluation;
    const assignment = parsed.assignment;
    if (![note, evaluation, assignment].every(value => typeof value === 'string' && value.trim())) return null;
    return {
      lessonNote: note.trim().slice(0, 30000),
      evaluation: evaluation.trim().slice(0, 8000),
      assignment: assignment.trim().slice(0, 8000)
    };
  } catch {
    return null;
  }
}

// This route alone uses the same direct Chat Completions request as the working
// Messaging feature. Nothing in Messaging or the shared AI config is changed.
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
    if (!apiKey) return NextResponse.json({ success: false, error: 'OPENAI_API_KEY is not set in this deployment. The Messaging menu may show a sample message when the key is missing.' }, { status: 503 });
    const model = process.env.AI_MODEL || 'gpt-4o-mini';
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(50000),
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are an experienced Nigerian schoolteacher. Write an accurate age-appropriate lesson note for a creche, primary or secondary class. Return ONLY a JSON object with exactly three nonempty string keys: lessonNote, evaluation, assignment. The lessonNote must include objectives, clear explanation, worked examples and recap. Evaluation must have numbered assessment questions; assignment must have numbered take-home tasks. Do not invent sources. Output should be concise enough to fit in about 2500 tokens. A teacher will review the draft before publication.' },
          { role: 'user', content: `Subject: ${subject.name}\nClass: ${schoolClass.name} (${schoolClass.level})\nTopic: ${topic.trim()}\nTeacher instructions: ${instructions.trim() || 'Explain the topic clearly using familiar examples.'}\nCreate lessonNote, evaluation and assignment in ONE JSON object.` }
        ],
        max_tokens: 3000,
        temperature: 0.6
        // Do not force response_format: some AI_MODEL deployments reject JSON mode.
      })
    });
    if (!response.ok) {
      console.error('Lesson note OpenAI request failed', { status: response.status, model });
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
    if (!content) return NextResponse.json({ success: false, error: 'OpenAI returned an empty response. Please retry.' }, { status: 502 });
    const result = extractSections(content);
    if (!result) {
      console.error('Lesson note response not complete', { finishReason: choice?.finish_reason, model });
      const error = choice?.finish_reason === 'length'
        ? 'The AI response was cut short. Ask for a shorter note in the instructions and retry.'
        : 'AI did not return all three sections. Please retry or type them manually.';
      return NextResponse.json({ success: false, error }, { status: 502 });
    }
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Generate lesson note request failed:', error);
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return NextResponse.json({ success: false,
      error: timedOut ? 'OpenAI took too long to respond. Please retry.' : 'AI connection failed. Please retry or type the note manually.'
    }, { status: timedOut ? 504 : 502 });
  }
}
