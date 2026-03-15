import { useState, useRef, useEffect, useCallback } from 'react';

const TARGET_MS = 5000;
const INTERVAL_MS = 25;

export function useAIStream() {
  const [text, setText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const posRef = useRef(0);
  const fullTextRef = useRef('');

  const clear = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startStream = useCallback((fullText: string) => {
    clear();
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
        clear();
        setIsStreaming(false);
        setIsDone(true);
      }
    }, INTERVAL_MS);
  }, []);

  useEffect(() => () => clear(), []);

  return { text, isStreaming, isDone, startStream };
}
