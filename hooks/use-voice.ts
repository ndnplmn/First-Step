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

export function useVoice(): VoiceState {
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // AudioContext is created on user gesture (voice toggle) to bypass autoplay policy
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Toggle must be called via user gesture — that's when AudioContext is unlocked
  const toggleVoiceMode = useCallback(() => {
    setIsVoiceMode(v => {
      if (!v) getAudioContext(); // unlock on activation
      return !v;
    });
    setVoiceError(null);
  }, [getAudioContext]);

  const startRecording = useCallback(async () => {
    setVoiceError(null);
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
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise(resolve => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) { resolve(null); return; }

      recorder.onstop = async () => {
        recorder.stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const ext = recorder.mimeType.includes('webm') ? 'webm' : 'mp4';
        const file = new File([blob], `audio.${ext}`, { type: recorder.mimeType });
        const formData = new FormData();
        formData.append('audio', file);

        setIsRecording(false);
        setIsTranscribing(true);
        try {
          const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
          if (!res.ok) throw new Error('Transcription failed');
          const { text } = await res.json() as { text: string };
          setTranscribedText(text);
          resolve(text);
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

  // Uses AudioContext instead of HTMLAudioElement — no autoplay restrictions
  const speak = useCallback(async (text: string) => {
    setVoiceError(null);
    setIsSpeaking(true);
    // Stop any current playback
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch { /* already stopped */ }
      sourceRef.current = null;
    }
    try {
      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`Speak error: ${res.status}`);

      const arrayBuffer = await res.arrayBuffer();
      const ctx = getAudioContext();
      const decoded = await ctx.decodeAudioData(arrayBuffer);
      const source = ctx.createBufferSource();
      source.buffer = decoded;
      source.connect(ctx.destination);
      sourceRef.current = source;
      source.onended = () => {
        sourceRef.current = null;
        setIsSpeaking(false);
      };
      source.start();
    } catch {
      setIsSpeaking(false);
      setVoiceError('Error al generar voz.');
    }
  }, [getAudioContext]);

  const cancelSpeech = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch { /* already stopped */ }
      sourceRef.current = null;
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
