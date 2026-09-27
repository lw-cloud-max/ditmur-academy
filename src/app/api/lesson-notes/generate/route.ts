import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Generate one editable plain-text draft. This route NEVER saves or publishes.
// Requiring a JSON object with three exact keys caused valid OpenAI output to
// be rejected; the teacher now gets the response in the existing note field.
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
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(50000),
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are an experienced Nigerian schoolteacher. Write an age-appropriate, accurate lesson note as PLAIN TEXT, not JSON. Organize it under these headings in this order: LESSON NOTE, EVALUATION, ASSIGNMENT. Under LESSON NOTE include objectives, a clear explanation, worked examples and a recap. Under EVALUATION write numbered assessment questions. Under ASSIGNMENT write numbered take-home tasks. A teacher will review the draft before publication.' },
          { role: 'user', content: `Subject: ${subject.name}\nClass: ${schoolClass.name} (${schoolClass.level})\nTopic: ${topic.trim()}\nTeacher instructions: ${instructions.trim() || 'Explain clearly using familiar examples.'}\nWrite the lesson note, evaluation and assignment together in ONE plain-text response.` }
        ],
        max_tokens: 3000,
        temperature: 0.6
      })
    });
    if (!response.ok) {
      console.error('Lesson note OpenAI request failed', { status: response.status, model });
      const error = response.status === 401 || response.status === 403
        ? 'OpenAI rejected the configured key or project permissions. Check the Vercel production OPENAI_API_KEY.'
        : response.status === 429
          ? 'OpenAI rate limit or quota reached. Check your OpenAI billing and retry later.'
          : response.status === 400
            ? 'OpenAI rejected the request. Check that AI_MODEL supports Chat Completions (try gpt-4o-mini).'
            : `OpenAI service returned HTTP ${response.status}. Please retry later.`;
      return NextResponse.json({ success: false, error }, { status: 502 });
    }
    const payload = await response.json();
    const choice = payload.choices?.[0];
    const content = choice?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ success: false, error: 'OpenAI returned no text. Check the AI_MODEL setting or try again.' }, { status: 502 });
    }
    // Unlike the previous JSON parser, no nonempty text is thrown away. If
    // a model still returns structured JSON, present it as readable sections.
    let draft = content.trim();
    try {
      const json = JSON.parse(draft.match(/\{[\s\S]*\}/)?.[0] || '');
      const note = json.lessonNote ?? json.lesson_note ?? json.note;
      if (typeof note === 'string' && note.trim()) {
        const readable = (value: unknown) => typeof value === 'string' ? value.trim()
          : Array.isArray(value) ? value.map((item, index) => `${index + 1}. ${String(item)}`).join('\n') : '';
        draft = `LESSON NOTE\n${note.trim()}`;
        if (readable(json.evaluation)) draft += `\n\nEVALUATION\n${readable(json.evaluation)}`;
        if (readable(json.assignment)) draft += `\n\nASSIGNMENT\n${readable(json.assignment)}`;
      }
    } catch { /* Plain text needs no parsing. */ }
    const warning = choice?.finish_reason === 'length'
      ? 'The AI response may have been cut short. Review the evaluation and assignment before publishing.'
      : 'Review that the note includes both evaluation and assignment before publishing.';
    return NextResponse.json({ success: true,
      data: { lessonNote: draft.slice(0, 30000), evaluation: '', assignment: '' }, warning
    });
  } catch (error) {
    console.error('Generate lesson note request failed:', error);
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return NextResponse.json({ success: false,
      error: timedOut ? 'OpenAI took too long to respond. Please retry.' : 'AI connection failed. Please retry or type the note manually.'
    }, { status: timedOut ? 504 : 502 });
  }
}
