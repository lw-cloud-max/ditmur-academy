import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { topic, numQuestions, examType, subject, action, question, options, correctAnswer } = body;

    console.log('AI CBT Request:', { action, topic, numQuestions, examType, subject });

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.log('OPENAI_API_KEY not configured');
      return NextResponse.json({ 
        success: false, 
        error: 'OpenAI API key not configured' 
      }, { status: 500 });
    }

    // Action: Generate explanation for a single question
    if (action === 'explain' && question) {
      console.log('Generating explanation for question');
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL || 'gpt-4o-mini',
          messages: [{ 
            role: 'user', 
            content: `Provide a clear explanation for this question:\n\nQuestion: ${question}\nA. ${options.A}\nB. ${options.B}\nC. ${options.C}\nD. ${options.D}\nCorrect: ${correctAnswer}\n\nExplain why the answer is correct. Keep it concise.` 
          }],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        return NextResponse.json({ success: false, error: 'AI API error' }, { status: 500 });
      }

      const data = await response.json();
      const explanation = data.choices?.[0]?.message?.content || '';
      return NextResponse.json({ success: true, explanation });
    }

    // Action: Generate multiple questions
    if (!topic || !numQuestions) {
      return NextResponse.json({ success: false, error: 'Topic and number of questions required' }, { status: 400 });
    }

    console.log('Generating', numQuestions, 'questions for topic:', topic);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'gpt-4o-mini',
        messages: [{ 
          role: 'user', 
          content: `Generate ${numQuestions} multiple-choice questions about "${topic}" for ${subject || 'Mathematics'}.

Return as JSON array:
[{"text":"Question?","optionA":"A","optionB":"B","optionC":"C","optionD":"D","correctAnswer":"B","explanation":"Why B is correct","topic":"${topic}","difficulty":"EASY"}]

Return ONLY the JSON array.` 
        }],
        max_tokens: 4000,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      return NextResponse.json({ success: false, error: 'AI API error' }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const questions = JSON.parse(jsonMatch[0]);
        console.log('Generated', questions.length, 'questions');
        return NextResponse.json({ success: true, data: questions });
      }
    } catch (e) {
      console.error('JSON parse error:', e);
    }

    return NextResponse.json({ success: false, error: 'Failed to parse AI response' }, { status: 500 });

  } catch (error: any) {
    console.error('AI CBT Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
