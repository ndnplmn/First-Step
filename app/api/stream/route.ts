import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { createServerClient } from '@supabase/ssr';
import { isRateLimited } from '@/lib/rate-limit';

const MODEL = 'llama-3.3-70b-versatile';

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

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

export async function POST(request: NextRequest) {
  try {
    const { data: { user } } = await getSupabaseUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isRateLimited(user.id, 'stream', 20, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json() as { prompt: string; temperature?: number };

    if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.length > 32000) {
      return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 });
    }

    const groq = getGroq();
    const stream = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: body.prompt }],
      temperature: body.temperature ?? 0.7,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? '';
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error('[stream route]', err);
    return NextResponse.json({ error: 'Stream failed' }, { status: 500 });
  }
}
