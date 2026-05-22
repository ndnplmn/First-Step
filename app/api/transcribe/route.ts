import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
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

    if (isRateLimited(user.id, 'transcribe', 10, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('[transcribe] Missing GROQ_API_KEY');
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('audio') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No audio file' }, { status: 400 });
    }

    const groq = new Groq({ apiKey });

    const transcription = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3-turbo',
      language: 'es',
      response_format: 'text',
    });

    const text = typeof transcription === 'string'
      ? transcription
      : (transcription as { text: string }).text;

    return NextResponse.json({ text });
  } catch (err) {
    console.error('[transcribe] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
