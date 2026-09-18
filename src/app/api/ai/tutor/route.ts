import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { message, subject, studentLevel } = await req.json();

    if (!message) {
      return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
    }

    // Check for API key
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.log('OPENAI_API_KEY not found in environment');
      return NextResponse.json({ 
        success: true, 
        response: `I'd love to help with "${message}"! However, the AI Tutor needs an OpenAI API key to be configured. Please ask your administrator to add OPENAI_API_KEY to the environment variables.`
      });
    }

    // Make direct API call to OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are Ditmur Academy's AI Tutor. Be helpful, encouraging, and educational. Use emojis occasionally. Explain concepts clearly for ${studentLevel || 'secondary school'} students.`
          },
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      return NextResponse.json({ 
        success: false, 
        error: `OpenAI API error: ${response.status}` 
      }, { status: 500 });
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

    return NextResponse.json({ success: true, response: aiResponse });

  } catch (error: any) {
    console.error('AI Tutor Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: `Error: ${error.message}` 
    }, { status: 500 });
  }
}
