import { NextResponse } from 'next/server';

export async function GET() {
  const config = {
    hasAgentRouterKey: !!process.env.AGENTROUTER_API_KEY,
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    baseURL: process.env.AGENTROUTER_BASE_URL || 'https://api.agentrouter.org/v1 (default)',
    aiModel: process.env.AI_MODEL || 'gpt-4o-mini (default)',
    agentRouterKeyLength: process.env.AGENTROUTER_API_KEY?.length || 0,
    openaiKeyLength: process.env.OPENAI_API_KEY?.length || 0,
  };

  return NextResponse.json({
    success: true,
    message: 'AI Configuration Check',
    config: config,
    isConfigured: config.hasAgentRouterKey || config.hasOpenAIKey,
    instructions: !config.hasAgentRouterKey && !config.hasOpenAIKey 
      ? 'Please set AGENTROUTER_API_KEY in Vercel Environment Variables'
      : 'AI is configured!'
  });
}
