import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;

    if (!apiKey || !voiceId) {
      console.error('[speak] Missing ElevenLabs env vars');
      return NextResponse.json({ error: 'ElevenLabs not configured' }, { status: 500 });
    }

    const body = await req.json() as { text?: string };
    const text = body?.text;
    if (!text) return NextResponse.json({ error: 'No text' }, { status: 400 });

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
      const err = await res.text();
      console.error('[speak] ElevenLabs error:', res.status, err);
      return NextResponse.json({ error: `ElevenLabs error: ${res.status}` }, { status: 502 });
    }

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: { 'Content-Type': 'audio/mpeg' },
    });
  } catch (err) {
    console.error('[speak] Unexpected error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
