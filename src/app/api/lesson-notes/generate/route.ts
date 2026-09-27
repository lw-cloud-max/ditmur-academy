import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { createOpenAIClient, getAIModel } from '@/lib/ai-config';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// A single AI request produces all three editable sections. It NEVER publishes
// or saves automatically: the teacher reviews the draft before saving.
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !['STAFF', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Only teachers and admins can generate notes' }, { status: 403 });
    }
    const { subjectId, classId, topic, instructions } = await req.json();
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
    const ai = createOpenAIClient();
    if (!ai) return NextResponse.json({ success: false, error: 'AI is not configured: add OPENAI_API_KEY to Vercel' }, { status: 503 });

    const response = await ai.chat.completions.create({
      model: getAIModel(),
      temperature: 0.5,
      max_tokens: 3200,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `You create accurate, age-appropriate lesson notes for a Nigerian creche, primary and secondary school. Return ONLY a JSON object with exactly three string keys: "lessonNote", "evaluation", "assignment". The lessonNote should include clear learning objectives, explanations, worked examples and a short recap. Evaluation must contain numbered questions that assess the lesson; assignment must contain numbered take-home tasks. Do not invent sources or personal student data. Teachers will review your draft before publishing.` },
        { role: 'user', content: `Subject: ${subject.name}\nClass: ${schoolClass.name} (${schoolClass.level})\nTopic: ${topic.trim()}\nTeacher instructions: ${instructions.trim() || 'Teach the topic clearly at this level.'}\nProduce the lesson note, evaluation AND assignment together in one response.` }
      ]
    }, { signal: AbortSignal.timeout(45000) });
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('AI returned an empty draft');
    const result = JSON.parse(content);
    if (typeof result.lessonNote !== 'string' || typeof result.evaluation !== 'string' ||
        typeof result.assignment !== 'string' || !result.lessonNote.trim() ||
        !result.evaluation.trim() || !result.assignment.trim()) {
      throw new Error('AI returned incomplete sections');
    }
    return NextResponse.json({ success: true, data: {
      lessonNote: result.lessonNote.slice(0, 30000),
      evaluation: result.evaluation.slice(0, 8000),
      assignment: result.assignment.slice(0, 8000)
    } });
  } catch (error) {
    console.error('Generate lesson note error:', error);
    return NextResponse.json({ success: false, error: 'AI generation failed. Please retry or type the note manually.' }, { status: 502 });
  }
}
