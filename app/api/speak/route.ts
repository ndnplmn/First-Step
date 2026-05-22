import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isRateLimited } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 30;

function getSupabaseUser(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    }
  ).auth.getUser();
}

export async function POST(req: NextRequest) {
  try {
    const { data: { user } } = await getSupabaseUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isRateLimited(user.id, 'speak', 10, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { text } = await req.json() as { text: string };
    if (!text) return NextResponse.json({ error: 'No text' }, { status: 400 });

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;

    if (!apiKey || !voiceId) {
      console.error('[speak] Missing ElevenLabs env vars');
      return NextResponse.json({ error: 'ElevenLabs not configured' }, { status: 500 });
    }

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.8 },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[speak] ElevenLabs ${res.status}:`, errBody);
      return NextResponse.json(
        { error: `ElevenLabs error: ${res.status}`, details: errBody },
        { status: res.status }
      );
    }

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: { 'Content-Type': 'audio/mpeg' },
    });
  } catch (err) {
    console.error('[speak] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
