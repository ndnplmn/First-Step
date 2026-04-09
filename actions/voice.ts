'use server';

export async function transcribeAudio(formData: FormData): Promise<string> {
  const file = formData.get('audio') as File;
  if (!file) throw new Error('No audio file');

  const { Groq } = await import('groq-sdk');
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const transcription = await groq.audio.transcriptions.create({
    file,
    model: 'whisper-large-v3-turbo',
    language: 'es',
    response_format: 'text',
  });

  return typeof transcription === 'string' ? transcription : (transcription as { text: string }).text;
}

export async function speakText(text: string): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) throw new Error('ElevenLabs not configured');

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

  if (!res.ok) throw new Error(`ElevenLabs error: ${res.status}`);

  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  return `data:audio/mpeg;base64,${base64}`;
}
