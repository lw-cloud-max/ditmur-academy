import { NextResponse } from 'next/server';
import { createOpenAIClient, getAIModel, isAIConfigured } from '@/lib/ai-config';

export async function POST(req: Request) {
  try {
    const { message, subject, studentLevel } = await req.json();

    if (!message) {
      return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
    }

    console.log('AI Tutor Request:', { message: message.substring(0, 50), subject, studentLevel });

    const openai = createOpenAIClient();

    if (!openai || !isAIConfigured()) {
      console.log('AI not configured, returning mock response');
      return NextResponse.json({ 
        success: true, 
        response: `I'd love to help you with "${message}"! However, the AI Tutor is currently in demo mode. To enable full AI capabilities, please configure the AGENTROUTER_API_KEY in your environment variables.\n\nIn the meantime, here are some study tips:\n• Break down complex problems into smaller parts\n• Practice regularly with different examples\n• Don't hesitate to ask your teacher for help\n• Use the Study Hub for flashcards and trivia!` 
      });
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

    const model = getAIModel();
    console.log('Calling AI API with model:', model);

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || 'I apologize, I could not generate a response. Please try again.';

    console.log('AI response received successfully');

    return NextResponse.json({ success: true, response });
  } catch (error: any) {
    console.error('AI Tutor Error:', error.message);
    return NextResponse.json({ 
      success: false, 
      error: `AI Tutor error: ${error.message}` 
    }, { status: 500 });
  }
}
