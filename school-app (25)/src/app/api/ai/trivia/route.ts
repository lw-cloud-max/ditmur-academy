import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { subject } = await req.json();

    /* 
      REAL AI INTEGRATION (e.g. OpenAI)
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "system", content: `Generate a fun, highly fascinating academic trivia fact and an inspiring quote related to ${subject}. Return JSON { fact: "", quote: "" }` }]
      });
      return NextResponse.json({ success: true, data: JSON.parse(response.choices[0].message.content) });
    */

    await new Promise(resolve => setTimeout(resolve, 2000));

    let fact = "";
    let quote = "";

    if (subject.toLowerCase().includes("math")) {
      fact = "A 'jiffy' is an actual unit of time! It equals 1/100th of a second.";
      quote = "\"Pure mathematics is, in its way, the poetry of logical ideas.\" - Albert Einstein";
    } else if (subject.toLowerCase().includes("science")) {
      fact = "If you took out all the empty space in our atoms, the entire human race could fit into the volume of a sugar cube.";
      quote = "\"Science is a way of thinking much more than it is a body of knowledge.\" - Carl Sagan";
    } else {
      fact = `The concept of '${subject}' has incredibly deep historical roots spanning across multiple ancient civilizations!`;
      quote = "\"Education is the passport to the future, for tomorrow belongs to those who prepare for it today.\" - Malcolm X";
    }

    return NextResponse.json({ success: true, data: { fact, quote } });

  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to generate trivia." }, { status: 500 });
  }
}
