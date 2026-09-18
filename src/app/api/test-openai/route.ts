import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({
      success: false,
      error: 'OPENAI_API_KEY is not set in environment variables',
      hasKey: false
    });
  }

  // Test the API key with a simple request
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: 'OpenAI API key is valid and working!',
        hasKey: true,
        keyPrefix: apiKey.substring(0, 10) + '...'
      });
    } else {
      const error = await response.text();
      return NextResponse.json({
        success: false,
        error: `API key invalid or error: ${response.status}`,
        hasKey: true,
        details: error
      });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: `Connection error: ${error.message}`,
      hasKey: true
    });
  }
}
