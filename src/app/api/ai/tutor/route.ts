import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.AGENTROUTER_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AGENTROUTER_BASE_URL || 'https://api.agentrouter.org/v1',
});

export async function POST(req: Request) {
  try {
    const { message, subject, studentLevel } = await req.json();

    if (!message) {
      return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
    }

    const systemPrompt = `You are Ditmur Academy's AI Tutor, a friendly and knowledgeable educational assistant. 
Your role is to help students understand concepts, solve problems, and learn effectively.

Guidelines:
- Be encouraging and supportive
- Explain concepts clearly with examples
- Break down complex topics into simpler parts
- Use age-appropriate language for ${studentLevel || 'secondary school'} students
- If a student asks about ${subject || 'a subject'}, provide subject-specific help
- Encourage critical thinking rather than just giving answers
- Use emojis occasionally to make learning fun 📚✨

Current context:
- Student level: ${studentLevel || 'Secondary School'}
- Subject focus: ${subject || 'General'} (if specified by student)`;

    const completion = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || 'I apologize, I could not generate a response. Please try again.';

    return NextResponse.json({ success: true, response });
  } catch (error: any) {
    console.error('AI Tutor Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get response from AI tutor' 
    }, { status: 500 });
  }
}
