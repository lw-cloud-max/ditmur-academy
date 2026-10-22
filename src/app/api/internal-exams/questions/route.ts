import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'no-store' };
async function staffSession() {
  const session = await auth();
  return session?.user && ['ADMIN', 'STAFF'].includes(session.user.role) ? session : null;
}
const answerLetter = (value: unknown) => typeof value === 'string' ? value.trim().slice(0, 1).toUpperCase() : '';

export async function GET(req: Request) {
  const session = await staffSession();
  if (!session) return NextResponse.json({ success: false, error: 'Staff access required' }, { status: 403, headers: noStore });
  try {
    const examId = new URL(req.url).searchParams.get('examId');
    if (!examId) return NextResponse.json({ success: false, error: 'Exam ID required' }, { status: 400, headers: noStore });
    const questions = await prisma.internalQuestion.findMany({ where: { examId }, orderBy: { orderIndex: 'asc' } });
    return NextResponse.json({ success: true, data: questions }, { headers: noStore });
  } catch (error) {
    console.error('Fetch legacy internal exam questions failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ success: false, error: 'Failed to fetch questions' }, { status: 500, headers: noStore });
  }
}

export async function POST(req: Request) {
  const session = await staffSession();
  if (!session) return NextResponse.json({ success: false, error: 'Staff access required' }, { status: 403, headers: noStore });
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ success: false, error: 'Invalid question' }, { status: 400, headers: noStore });
    const value = body as Record<string, unknown>;
    const examId = typeof value.examId === 'string' ? value.examId.trim() : '';
    const text = typeof value.text === 'string' ? value.text.trim() : '';
    const optionA = typeof value.optionA === 'string' ? value.optionA.trim() : '';
    const optionB = typeof value.optionB === 'string' ? value.optionB.trim() : '';
    const optionC = typeof value.optionC === 'string' ? value.optionC.trim() : '';
    const optionD = typeof value.optionD === 'string' ? value.optionD.trim() : '';
    const correctAnswer = answerLetter(value.correctAnswer);
    const marks = value.marks === undefined ? 1 : Number(value.marks);
    if (!examId || !text || !optionA || !optionB || !optionC || !optionD || !/^[ABCD]$/.test(correctAnswer) || !Number.isFinite(marks) || marks <= 0) {
      return NextResponse.json({ success: false, error: 'Question, all four options, answer A-D and positive marks are required' }, { status: 400, headers: noStore });
    }
    const exam = await prisma.internalExam.findUnique({ where: { id: examId }, select: { id: true } });
    if (!exam) return NextResponse.json({ success: false, error: 'Internal exam not found' }, { status: 404, headers: noStore });
    const last = await prisma.internalQuestion.findFirst({ where: { examId }, orderBy: { orderIndex: 'desc' }, select: { orderIndex: true } });
    const created = await prisma.internalQuestion.create({ data: {
      examId, text, imageUrl: typeof value.imageUrl === 'string' ? value.imageUrl : null,
      optionA, optionB, optionC, optionD, correctAnswer, marks, orderIndex: (last?.orderIndex || 0) + 1
    } });
    return NextResponse.json({ success: true, data: created }, { status: 201, headers: noStore });
  } catch (error) {
    console.error('Create legacy internal exam question failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ success: false, error: 'Failed to create question' }, { status: 500, headers: noStore });
  }
}

export async function PATCH(req: Request) {
  const session = await staffSession();
  if (!session) return NextResponse.json({ success: false, error: 'Staff access required' }, { status: 403, headers: noStore });
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ success: false, error: 'Invalid question update' }, { status: 400, headers: noStore });
    const value = body as Record<string, unknown>;
    const id = typeof value.id === 'string' ? value.id.trim() : '';
    if (!id || id.length > 150) return NextResponse.json({ success: false, error: 'Question ID required' }, { status: 400, headers: noStore });
    const current = await prisma.internalQuestion.findUnique({ where: { id }, select: { id: true, examId: true } });
    if (!current) return NextResponse.json({ success: false, error: 'Exam question no longer exists. Refresh the exam and retry.' }, { status: 404, headers: noStore });
    const data: { text?: string; imageUrl?: string | null; optionA?: string; optionB?: string; optionC?: string; optionD?: string; correctAnswer?: string; marks?: number } = {};
    for (const field of ['text', 'optionA', 'optionB', 'optionC', 'optionD'] as const) {
      if (value[field] === undefined) continue;
      if (typeof value[field] !== 'string' || !value[field].trim()) return NextResponse.json({ success: false, error: `${field} cannot be empty` }, { status: 400, headers: noStore });
      data[field] = value[field].trim();
    }
    if (value.correctAnswer !== undefined) {
      const answer = answerLetter(value.correctAnswer);
      if (!/^[ABCD]$/.test(answer)) return NextResponse.json({ success: false, error: 'Correct answer must be A, B, C or D' }, { status: 400, headers: noStore });
      data.correctAnswer = answer;
    }
    if (value.imageUrl !== undefined) {
      if (value.imageUrl !== null && typeof value.imageUrl !== 'string') return NextResponse.json({ success: false, error: 'Image URL is invalid' }, { status: 400, headers: noStore });
      data.imageUrl = typeof value.imageUrl === 'string' && value.imageUrl.trim() ? value.imageUrl.trim() : null;
    }
    if (value.marks !== undefined) {
      const marks = Number(value.marks);
      if (!Number.isFinite(marks) || marks <= 0 || marks > 100) return NextResponse.json({ success: false, error: 'Marks must be between 0 and 100' }, { status: 400, headers: noStore });
      data.marks = marks;
    }
    if (!Object.keys(data).length) return NextResponse.json({ success: false, error: 'No editable fields supplied' }, { status: 400, headers: noStore });
    const question = await prisma.internalQuestion.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: question }, { headers: noStore });
  } catch (error) {
    console.error('Update legacy internal exam question failed:', error && typeof error === 'object' && 'code' in error ? String(error.code) : error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ success: false, error: 'Failed to update exam question. Refresh and retry; no other exam questions were changed.' }, { status: 500, headers: noStore });
  }
}

export async function DELETE(req: Request) {
  const session = await staffSession();
  if (!session) return NextResponse.json({ success: false, error: 'Staff access required' }, { status: 403, headers: noStore });
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Question ID required' }, { status: 400, headers: noStore });
    await prisma.internalQuestion.delete({ where: { id } });
    return NextResponse.json({ success: true }, { headers: noStore });
  } catch (error) {
    console.error('Delete legacy internal exam question failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ success: false, error: 'Failed to delete question' }, { status: 500, headers: noStore });
  }
}
