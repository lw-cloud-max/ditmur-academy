import { NextResponse } from 'next/server';

// The legacy broadcast route previously logged private message text and
// falsely claimed delivery. Do not accept or log recipients/message bodies.
export async function POST() {
  return NextResponse.json({ success: false, error: 'Broadcast messaging is unavailable. No message was sent.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } });
}
