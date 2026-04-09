import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('[transcribe] Missing GROQ_API_KEY');
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('audio') as File | null;
    if (!file) return NextResponse.json({ error: 'No audio file' }, { status: 400 });

    const { Groq } = await import('groq-sdk');
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
    console.error('[transcribe] Unexpected error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
