import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const openaiKey = process.env.OPENAI_API_KEY;
  const aiModel = process.env.AI_MODEL || 'gpt-4o-mini';

  const config = {
    hasOpenAIKey: !!openaiKey,
    openaiKeyLength: openaiKey?.length || 0,
    openaiKeyPrefix: openaiKey ? openaiKey.substring(0, 10) + '...' : 'Not set',
    aiModel: aiModel,
    isConfigured: !!openaiKey,
  };

  return NextResponse.json({
    success: true,
    message: 'AI Configuration Check (OpenAI)',
    config: config,
    instructions: !openaiKey 
      ? 'Please add OPENAI_API_KEY to your Netlify environment variables'
      : 'OpenAI is configured! AI features should work.'
  });
}
