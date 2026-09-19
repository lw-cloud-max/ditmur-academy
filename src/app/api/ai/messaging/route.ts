import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    
    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      // Fallback to mock data if no API key
      return NextResponse.json({ 
        success: true, 
        data: { 
          subject: "Important Update from Ditmur Academy", 
          message: `Dear Parents and Guardians,\n\nRegarding: ${prompt}\n\nWe would like to inform you about the above matter. Please contact the school office for more details.\n\nWarm regards,\nThe Administration\nDitmur Academy` 
        } 
      });
    }

    // Call OpenAI API directly
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
            content: 'You are the Principal of Ditmur Academy. Compose a professional, warm, and articulate email or SMS to parents. Return JSON with "subject" and "message" keys.'
          },
          { role: 'user', content: `Write a message about: ${prompt}` }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('AI API error');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Try to parse JSON from response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ success: true, data: parsed });
      }
    } catch (e) {
      // If JSON parsing fails, return as plain message
    }

    return NextResponse.json({ 
      success: true, 
      data: { subject: "Message from Ditmur Academy", message: content } 
    });

  } catch (error) {
    console.error('Messaging AI error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate message' }, { status: 500 });
  }
}