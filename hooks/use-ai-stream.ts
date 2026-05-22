'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

const TARGET_MS = 5000;
const INTERVAL_MS = 25;

export function useAIStream() {
  const [text, setText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const posRef = useRef(0);
  const fullTextRef = useRef('');

  const clearInterval_ = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Fake stream: receive full text, type it out over TARGET_MS
  const startStream = useCallback((fullText: string) => {
    clearInterval_();
    abortRef.current?.abort();
    fullTextRef.current = fullText;
    posRef.current = 0;
    setText('');
    setIsStreaming(true);
    setIsDone(false);

    const chunkSize = Math.max(1, Math.floor(fullText.length / (TARGET_MS / INTERVAL_MS)));

    intervalRef.current = setInterval(() => {
      posRef.current = Math.min(posRef.current + chunkSize, fullText.length);
      setText(fullText.slice(0, posRef.current));

      if (posRef.current >= fullText.length) {
        clearInterval_();
        setIsStreaming(false);
        setIsDone(true);
      }
    }, INTERVAL_MS);
  }, []);

  // Real stream: fetch from API route and stream chunks as they arrive
  const streamFromUrl = useCallback(async (url: string, body: unknown) => {
    clearInterval_();
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setText('');
    setIsStreaming(true);
    setIsDone(false);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Stream request failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setText(prev => prev + chunk);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      throw err;
    } finally {
      setIsStreaming(false);
      setIsDone(true);
      abortRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    clearInterval_();
    abortRef.current?.abort();
  }, []);

  return { text, isStreaming, isDone, startStream, streamFromUrl };
}
