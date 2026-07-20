import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    if (!prompt) return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 });

    /* 
      ======================================================
      REAL AI INTEGRATION (CLAUDE / ANTHROPIC)
      ======================================================
      To make this real, run: npm install @anthropic-ai/sdk
      Then uncomment the code below:

      import Anthropic from '@anthropic-ai/sdk';
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 1000,
        system: "You are the Principal of Ditmur Academy. Compose a professional, warm, and highly articulate email or SMS to parents based on the user's rough prompt. Return a JSON object with 'subject' and 'message' keys.",
        messages: [{ role: "user", content: `Prompt: ${prompt}` }]
      });

      const aiData = JSON.parse(response.content[0].text);
      return NextResponse.json({ success: true, data: aiData });
      ======================================================
    */

    await new Promise(resolve => setTimeout(resolve, 2500));

    const aiSubject = "Important Update from Ditmur Academy";
    const aiMessage = `Dear Parents and Guardians,

I hope this message finds you well. 

Regarding your query: "${prompt}", we would like to formally advise that all necessary arrangements have been put in place by the school administration to ensure the best possible outcome for our students.

As always, Ditmur Academy remains committed to cultivating excellence and discipline. Should you have any further questions, please do not hesitate to contact the school office.

Warm regards,
The Administration
Ditmur Academy`;

    return NextResponse.json({ success: true, data: { subject: aiSubject, message: aiMessage } });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to generate AI message." }, { status: 500 });
  }
}
