'use client';

import { useState, useRef, useCallback } from 'react';
import { transcribeAudio, speakText } from '@/actions/voice';

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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleVoiceMode = useCallback(() => {
    setIsVoiceMode(v => !v);
    setVoiceError(null);
  }, []);

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
          const text = await transcribeAudio(formData);
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

  const speak = useCallback(async (text: string) => {
    setVoiceError(null);
    setIsSpeaking(true);
    try {
      const dataUrl = await speakText(text);
      const audio = new Audio(dataUrl);
      audioRef.current = audio;
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => { setIsSpeaking(false); setVoiceError('Error al reproducir audio.'); };
      await audio.play();
    } catch {
      setIsSpeaking(false);
      setVoiceError('Error al generar voz.');
    }
  }, []);

  const cancelSpeech = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
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
