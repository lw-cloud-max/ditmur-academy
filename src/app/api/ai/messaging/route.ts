import { NextResponse } from 'next/server';

// Disabled alongside the legacy mock broadcast composer. Prevent an unused
// drafting endpoint from making billable AI requests outside the safe flow.
export async function POST() {
  return NextResponse.json({ success: false, error: 'Broadcast messaging is unavailable.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } });
}
