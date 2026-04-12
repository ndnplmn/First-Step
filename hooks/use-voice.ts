'use client';

import { useState, useRef, useCallback } from 'react';

export interface VoiceState {
  isVoiceMode: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  isSpeaking: boolean;
  transcribedText: string;
  voiceError: string | null;
  toggleVoiceMode: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  speak: (text: string) => Promise<void>;
  cancelSpeech: () => void;
  clearTranscribedText: () => void;
}

// ─── TTS: ElevenLabs → fallback native ───────────────────────────────────────

function speakNative(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) { reject(new Error('No TTS support')); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const spanish = voices.find(v => v.lang.startsWith('es') && v.localService);
    if (spanish) utterance.voice = spanish;
    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error('SpeechSynthesis error'));
    window.speechSynthesis.speak(utterance);
  });
}

// ─── STT: Web Speech API (primary) → Groq Whisper (fallback) ────────────────

// Web Speech API types (available in Chrome, Edge, Safari — not Firefox)
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;
interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
}
interface SpeechRecognitionEvent { results: SpeechRecognitionResultList }
interface SpeechRecognitionErrorEvent { error: string }

const hasSpeechRecognition = (): boolean =>
  typeof window !== 'undefined' &&
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

function createRecognition(): SpeechRecognitionInstance {
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition!;
  const r = new SR();
  r.lang = 'es-ES';
  r.continuous = false;
  r.interimResults = false;
  r.maxAlternatives = 1;
  return r;
}

// ─────────────────────────────────────────────────────────────────────────────

export function useVoice(): VoiceState {
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Web Speech API refs
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // MediaRecorder refs (Groq Whisper fallback)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // AudioContext for ElevenLabs playback
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    return audioCtxRef.current;
  }, []);

  const toggleVoiceMode = useCallback(() => {
    setIsVoiceMode(v => {
      if (!v) getAudioContext(); // unlock AudioContext on user gesture
      return !v;
    });
    setVoiceError(null);
  }, [getAudioContext]);

  // ── startRecording ──────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    setVoiceError(null);

    if (hasSpeechRecognition()) {
      // Primary: Web Speech API — no network, no hallucinations
      try {
        const recognition = createRecognition();
        recognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
        // onerror handler — if mic denied or aborted
        recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
          if (e.error === 'no-speech') {
            // silence — don't show error, just reset
          } else if (e.error === 'not-allowed') {
            setVoiceError('No se pudo acceder al micrófono.');
          }
          setIsRecording(false);
        };
      } catch {
        setVoiceError('No se pudo iniciar el reconocimiento de voz.');
      }
    } else {
      // Fallback: MediaRecorder → Groq Whisper (Firefox)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
        const recorder = new MediaRecorder(stream, { mimeType });
        chunksRef.current = [];
        recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch {
        setVoiceError('No se pudo acceder al micrófono.');
      }
    }
  }, []);

  // ── stopRecording ───────────────────────────────────────────────────────────

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (hasSpeechRecognition() && recognitionRef.current) {
      // Primary: collect Web Speech API result
      return new Promise(resolve => {
        const recognition = recognitionRef.current!;

        recognition.onresult = (e: SpeechRecognitionEvent) => {
          const text = Array.from(e.results)
            .map((r: SpeechRecognitionResult) => r[0].transcript)
            .join(' ')
            .trim();
          if (text) {
            setTranscribedText(text);
            resolve(text);
          } else {
            resolve(null);
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
          recognitionRef.current = null;
          // If onresult never fired (silence), resolve null
          resolve(null);
        };

        recognition.stop();
      });
    }

    // Fallback: Groq Whisper via API route
    return new Promise(resolve => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) { resolve(null); return; }

      recorder.onstop = async () => {
        recorder.stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });

        // Minimum size check — less than 5KB is almost certainly silence
        if (blob.size < 5000) {
          setIsRecording(false);
          resolve(null);
          return;
        }

        const ext = recorder.mimeType.includes('webm') ? 'webm' : 'mp4';
        const file = new File([blob], `audio.${ext}`, { type: recorder.mimeType });
        const formData = new FormData();
        formData.append('audio', file);

        setIsRecording(false);
        setIsTranscribing(true);
        try {
          const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
          if (!res.ok) throw new Error(`Transcribe ${res.status}`);
          const { text } = await res.json() as { text: string };
          if (text) {
            setTranscribedText(text);
            resolve(text);
          } else {
            resolve(null);
          }
        } catch {
          setVoiceError('No se pudo transcribir el audio.');
          resolve(null);
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.stop();
    });
  }, []);

  // ── speak ───────────────────────────────────────────────────────────────────

  const speak = useCallback(async (text: string) => {
    setVoiceError(null);
    setIsSpeaking(true);

    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch { /* already stopped */ }
      sourceRef.current = null;
    }
    window.speechSynthesis?.cancel();

    try {
      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const ctx = getAudioContext();
        const decoded = await ctx.decodeAudioData(arrayBuffer);
        const source = ctx.createBufferSource();
        source.buffer = decoded;
        source.connect(ctx.destination);
        sourceRef.current = source;
        source.onended = () => { sourceRef.current = null; setIsSpeaking(false); };
        source.start();
      } else {
        // ElevenLabs unavailable (402, 500…) — native browser TTS
        await speakNative(text);
        setIsSpeaking(false);
      }
    } catch {
      try { await speakNative(text); } catch { setVoiceError('Error al generar voz.'); }
      finally { setIsSpeaking(false); }
    }
  }, [getAudioContext]);

  const cancelSpeech = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch { /* already stopped */ }
      sourceRef.current = null;
    }
    window.speechSynthesis?.cancel();
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* already stopped */ }
      recognitionRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const clearTranscribedText = useCallback(() => setTranscribedText(''), []);

  return {
    isVoiceMode, isRecording, isTranscribing, isSpeaking,
    transcribedText, voiceError,
    toggleVoiceMode, startRecording, stopRecording,
    speak, cancelSpeech, clearTranscribedText,
  };
}
