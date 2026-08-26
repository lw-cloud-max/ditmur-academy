import { NextResponse } from 'next/server';
import { createOpenAIClient, getAIModel, isAIConfigured } from '@/lib/ai-config';

export async function POST(req: Request) {
  try {
    const { subject } = await req.json();

    const openai = createOpenAIClient();

    if (openai && isAIConfigured()) {
      try {
        const response = await openai.chat.completions.create({
          model: getAIModel(),
          messages: [{ 
            role: "system", 
            content: `Generate a fun, highly fascinating academic trivia fact and an inspiring quote related to ${subject}. Return JSON { fact: "", quote: "" }` 
          }],
          response_format: { type: "json_object" }
        });

        const content = response.choices[0].message.content;
        if (content) {
          const parsed = JSON.parse(content);
          return NextResponse.json({ success: true, data: parsed });
        }
      } catch (aiError) {
        console.warn("AI trivia generation failed, using fallback:", aiError);
      }
    }

    // Fallback to mock data
    await new Promise(resolve => setTimeout(resolve, 1000));

    let fact = "";
    let quote = "";

    if (subject.toLowerCase().includes("math")) {
      fact = "A 'jiffy' is an actual unit of time! It equals 1/100th of a second.";
      quote = "\"Pure mathematics is, in its way, the poetry of logical ideas.\" - Albert Einstein";
    } else if (subject.toLowerCase().includes("science")) {
      fact = "If you took out all the empty space in our atoms, the entire human race could fit into the volume of a sugar cube.";
      quote = "\"Science is a way of thinking much more than it is a body of knowledge.\" - Carl Sagan";
    } else if (subject.toLowerCase().includes("english") || subject.toLowerCase().includes("literature")) {
      fact = "The shortest complete sentence in English is 'I am.' It contains a subject and a verb!";
      quote = "\"The more that you read, the more things you will know. The more that you learn, the more places you'll go.\" - Dr. Seuss";
    } else if (subject.toLowerCase().includes("history")) {
      fact = "Oxford University is older than the Aztec Empire! Oxford started teaching in 1096, while the Aztec Empire began in 1428.";
      quote = "\"Those who cannot remember the past are condemned to repeat it.\" - George Santayana";
    } else {
      fact = `The concept of '${subject}' has incredibly deep historical roots spanning across multiple ancient civilizations!`;
      quote = "\"Education is the passport to the future, for tomorrow belongs to those who prepare for it today.\" - Malcolm X";
    }

    return NextResponse.json({ success: true, data: { fact, quote } });

  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to generate trivia." }, { status: 500 });
  }
}
